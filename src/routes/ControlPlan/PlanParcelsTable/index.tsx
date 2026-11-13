import React, { useEffect, useMemo, useRef, useState } from 'react';

import { controlPlanParcelEndpoints } from '@/api/endpoints';
import Pagination from '@/components/dsfr/Pagination';
import Select from '@/components/dsfr/Select';
import Table from '@/components/dsfr/Table';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { ControlPlanFollowUpStatus, ControlPlanParcel, ControlPlanParcelSection } from '@/models/control-plan';
import ConfirmModal from '@/routes/ControlPlan/ConfirmModal';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import ParcelPreview from '@/routes/ControlPlan/ParcelPreview';
import {
    FOLLOW_UP_BADGE_CLASSES,
    FOLLOW_UP_LABELS,
    formatCount,
    formatPlanParcel,
    formatTimestampDay,
    invalidateControlPlanQueries,
    trackControlPlanError,
    trackControlPlanEvent,
} from '@/routes/ControlPlan/utils';
import DetectionCountCell from '@/routes/Table/DetectionCountCell';
import TagsCell from '@/routes/Table/TagsCell';
import { usePaginatedList } from '@/routes/Table/usePaginatedList';
import api, { ApiError } from '@/utils/api';
import { formatBigInt } from '@/utils/format';
import { scrollBelowHeader } from '@/utils/html';
import { getDetectionObjectLink } from '@/utils/link';
import { getPaginationPage } from '@/utils/pagination';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

const LIMITS = [10, 20, 50];

type ParcelAction = 'exclude' | 'include' | 'putBack' | 'restore' | 'remove';

const ACTION_ENDPOINTS: Record<ParcelAction, (uuid: string) => string> = {
    exclude: controlPlanParcelEndpoints.exclude,
    include: controlPlanParcelEndpoints.include,
    putBack: controlPlanParcelEndpoints.putBack,
    restore: controlPlanParcelEndpoints.restore,
    remove: controlPlanParcelEndpoints.remove,
};

const ACTION_TRACKING_NAMES: Record<ParcelAction, string> = {
    exclude: 'Parcelle écartée',
    include: 'Parcelle ajoutée',
    putBack: 'Parcelle remise en attente',
    restore: 'Parcelle réintégrée',
    remove: 'Parcelle retirée',
};

const RANKED_SECTIONS: ControlPlanParcelSection[] = ['PROPOSED', 'WAITING', 'PLANNED'];

// « AB 12 (Montpellier) »: what an action button says it acts on, among twenty identical ones
const getParcelName = (parcel: ControlPlanParcel) =>
    `${formatPlanParcel(parcel)}${parcel.commune ? ` (${parcel.commune.name})` : ''}`;

const getActionAnnouncement = (parcel: ControlPlanParcel, action: ParcelAction, section: ControlPlanParcelSection) => {
    const name = getParcelName(parcel);

    if (action === 'exclude') {
        return section === 'PROPOSED' && !parcel.addedByAgent
            ? `Parcelle ${name} écartée : la suivante de la liste d’attente prend sa place.`
            : `Parcelle ${name} écartée.`;
    }

    if (action === 'include') {
        return `Parcelle ${name} ajoutée aux parcelles proposées.`;
    }

    if (action === 'putBack') {
        return `Parcelle ${name} remise en liste d’attente.`;
    }

    return action === 'restore' ? `Parcelle ${name} réintégrée.` : `Parcelle ${name} retirée du plan.`;
};

const getObjectTypeCounts = (parcel: ControlPlanParcel) =>
    parcel.objectTypes.map(({ uuid, name, color, count }) => ({
        objectTypeUuid: uuid,
        objectTypeName: name,
        objectTypeColor: color,
        count,
    }));

interface ComponentProps {
    controlPlanUuid: string;
    section: ControlPlanParcelSection;
    canEdit: boolean;
    caption: string;
    emptyText: string;
    // the PLANNED parcels can be narrowed to one follow-up state
    followUpFilterShown?: boolean;
}

const Component: React.FC<ComponentProps> = ({
    controlPlanUuid,
    section,
    canEdit,
    caption,
    emptyText,
    followUpFilterShown = false,
}: ComponentProps) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const queryClient = useQueryClient();
    const [expandedUuids, setExpandedUuids] = useState<Set<string>>(new Set());
    const [followUpStatus, setFollowUpStatus] = useState<ControlPlanFollowUpStatus | ''>('');
    const [parcelToRemove, setParcelToRemove] = useState<ControlPlanParcel>();
    // read by screen readers: the row of an excluded parcel simply disappears
    const [announcement, setAnnouncement] = useState('');
    // the mutation is shared by the rows: its variables only know the last one sent
    const [pendingUuids, setPendingUuids] = useState<Set<string>>(new Set());
    // an action takes the row out of the list: the focus goes to the row now in its place
    const focusAfterActionRef = useRef<{ uuid: string; index: number } | null>(null);

    const filter = useMemo(
        () => ({ controlPlanUuid, section, ...(followUpStatus ? { followUpStatus } : {}) }),
        [controlPlanUuid, section, followUpStatus],
    );
    const { data, isLoading, isFetching, error, pagination, setPagination } = usePaginatedList<
        ControlPlanParcel,
        typeof filter
    >(controlPlanParcelEndpoints.list, filter, { initialLimit: 20, enabled: true });

    const mutation = useMutation<void, ApiError, { parcel: ControlPlanParcel; action: ParcelAction }>({
        mutationFn: ({ parcel, action }) => api(ACTION_ENDPOINTS[action](parcel.uuid), { method: 'POST' }),
        onMutate: ({ parcel }) => setPendingUuids((previous) => new Set(previous).add(parcel.uuid)),
        onSettled: (_, __, { parcel }) =>
            setPendingUuids((previous) => {
                const next = new Set(previous);
                next.delete(parcel.uuid);
                return next;
            }),
        onSuccess: (_, { parcel, action }) => {
            trackControlPlanEvent(
                ACTION_TRACKING_NAMES[action],
                action === 'remove' ? parcel.followUpStatus ?? undefined : section,
                RANKED_SECTIONS.includes(section) ? parcel.rank : undefined,
            );
            setParcelToRemove(undefined);
            setAnnouncement(getActionAnnouncement(parcel, action, section));
            focusAfterActionRef.current = {
                uuid: parcel.uuid,
                index: Math.max(data?.findIndex(({ uuid }) => uuid === parcel.uuid) ?? 0, 0),
            };
            // a removal puts objects back to « Non contrôlé »
            invalidateControlPlanQueries(queryClient, { detections: action === 'remove' });
        },
        onError: (mutationError, { action }) => trackControlPlanError(ACTION_TRACKING_NAMES[action], mutationError),
    });

    useEffect(() => {
        const request = focusAfterActionRef.current;
        if (!request || !data || data.some(({ uuid }) => uuid === request.uuid)) {
            return;
        }

        focusAfterActionRef.current = null;
        const rows = tableRef.current?.querySelectorAll<HTMLElement>('[data-parcel-row]');
        const row = rows?.length ? rows[Math.min(request.index, rows.length - 1)] : null;
        const target =
            row?.querySelector<HTMLElement>('[data-row-action]') ??
            row?.querySelector<HTMLElement>('button') ??
            tableRef.current?.querySelector<HTMLElement>('caption');

        if (target?.tagName === 'CAPTION') {
            target.tabIndex = -1;
        }
        target?.focus();
    }, [data]);

    const toggleRow = (parcel: ControlPlanParcel) => {
        if (!expandedUuids.has(parcel.uuid)) {
            trackControlPlanEvent(
                'Aperçu ouvert',
                section,
                RANKED_SECTIONS.includes(section) ? parcel.rank : undefined,
            );
        }
        setExpandedUuids((previous) => {
            const next = new Set(previous);
            if (next.has(parcel.uuid)) {
                next.delete(parcel.uuid);
            } else {
                next.add(parcel.uuid);
            }
            return next;
        });
    };

    const paginationPage = getPaginationPage(pagination);
    const ranked = RANKED_SECTIONS.includes(section);
    const datedSection = section === 'EXCLUDED' || section === 'REMOVED';
    const columnsCount = 5 + (ranked ? 1 : 0) + (section === 'PLANNED' ? 1 : 0) + (datedSection ? 1 : 0);

    const renderActions = (parcel: ControlPlanParcel) => {
        const pending = pendingUuids.has(parcel.uuid);
        const mapLink = parcel.detectionObjectUuids.length ? (
            <a
                className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-map-pin-2-line fr-btn--icon-left"
                href={getDetectionObjectLink(parcel.detectionObjectUuids[0])}
                target="_blank"
                rel="noopener noreferrer"
                title={`Voir la parcelle ${formatPlanParcel(parcel)} sur la carte - nouvelle fenêtre`}
                onClick={(event) => {
                    event.stopPropagation();
                    trackControlPlanEvent('Carte ouverte', section);
                }}
            >
                Carte
            </a>
        ) : null;

        const renderButton = (
            parcelAction: ParcelAction,
            label: string,
            ariaLabel: string,
            className = 'fr-btn--secondary',
        ) => (
            <button
                key={parcelAction}
                type="button"
                className={clsx('fr-btn fr-btn--sm', className)}
                disabled={pending}
                data-row-action
                aria-label={`${ariaLabel} ${getParcelName(parcel)}`}
                onClick={(event) => {
                    event.stopPropagation();
                    mutation.mutate({ parcel, action: parcelAction });
                }}
            >
                {label}
            </button>
        );

        let action: React.ReactNode = null;
        if (canEdit && section === 'PROPOSED' && parcel.addedByAgent) {
            action = renderButton('putBack', 'Remettre en attente', 'Remettre en liste d’attente la parcelle');
        } else if (canEdit && section === 'WAITING') {
            action = [
                renderButton('include', 'Ajouter au plan', 'Ajouter au plan la parcelle'),
                renderButton('exclude', 'Écarter', 'Écarter la parcelle', 'fr-btn--tertiary'),
            ];
        } else if (canEdit && section === 'PROPOSED') {
            action = renderButton('exclude', 'Écarter', 'Écarter la parcelle');
        } else if (canEdit && datedSection) {
            action = renderButton('restore', 'Réintégrer', 'Réintégrer la parcelle');
        } else if (canEdit && section === 'PLANNED' && parcel.followUpStatus !== 'CONTROLLED') {
            action = (
                <button
                    type="button"
                    className="fr-btn fr-btn--secondary fr-btn--sm"
                    data-row-action
                    aria-label={`Retirer du plan la parcelle ${getParcelName(parcel)}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        mutation.reset();
                        setParcelToRemove(parcel);
                    }}
                >
                    Retirer du plan
                </button>
            );
        }

        return (
            // the map link last: it stays aligned from row to row whatever the action
            <div className={classes.actions}>
                {action}
                {mapLink}
            </div>
        );
    };

    return (
        <div className={classes.container}>
            {followUpFilterShown ? (
                <Select
                    label="État du suivi"
                    className={classes.filter}
                    value={followUpStatus}
                    options={[
                        { value: '', label: 'Toutes les parcelles' },
                        ...(Object.keys(FOLLOW_UP_LABELS) as ControlPlanFollowUpStatus[]).map((status) => ({
                            value: status,
                            label: FOLLOW_UP_LABELS[status],
                        })),
                    ]}
                    onChange={(value) => setFollowUpStatus(value as ControlPlanFollowUpStatus | '')}
                />
            ) : null}

            {error ? (
                <ErrorAlert
                    className="fr-mb-2w"
                    error={error}
                    fallback="La liste des parcelles n’a pas pu être chargée."
                />
            ) : null}
            {mutation.isError && mutation.variables?.action !== 'remove' ? (
                <ErrorAlert className="fr-mb-2w" error={mutation.error} fallback="La parcelle n’a pas été modifiée." />
            ) : null}

            {isLoading ? (
                <Loader className={classes.loader} />
            ) : (
                <Table
                    caption={caption}
                    tableRef={tableRef}
                    busy={isFetching}
                    className={classes.table}
                    header={
                        <p className="fr-table__detail">
                            {pagination.total != null ? formatCount(pagination.total, 'parcelle') : null}
                        </p>
                    }
                    footerStart={
                        <Select
                            label="Nombre de lignes par page"
                            labelHidden
                            className={classes['limit-select']}
                            value={String(pagination.limit)}
                            options={LIMITS.map((limit) => ({
                                value: String(limit),
                                label: `${limit} lignes par page`,
                            }))}
                            onChange={(limit) => setPagination((previous) => ({ ...previous, limit: Number(limit) }))}
                        />
                    }
                    footerMiddle={
                        paginationPage ? (
                            <Pagination
                                page={paginationPage.currentPage}
                                totalPages={paginationPage.totalPages}
                                onChange={(page) => {
                                    setPagination((previous) => ({ ...previous, offset: (page - 1) * previous.limit }));
                                    scrollBelowHeader(tableRef.current);
                                }}
                            />
                        ) : null
                    }
                >
                    <thead>
                        <tr>
                            {ranked ? <th scope="col">Rang</th> : null}
                            <th scope="col">Commune</th>
                            <th scope="col">Parcelle</th>
                            <th scope="col">Zones à enjeux</th>
                            <th scope="col">Objets</th>
                            {section === 'PLANNED' ? <th scope="col">Suivi</th> : null}
                            {datedSection ? (
                                <th scope="col">{section === 'EXCLUDED' ? 'Écartée le' : 'Retirée le'}</th>
                            ) : null}
                            <th scope="col">
                                <span className="fr-sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.length === 0 ? (
                            <tr>
                                <td colSpan={columnsCount}>{emptyText}</td>
                            </tr>
                        ) : null}
                        {data?.map((parcel) => {
                            const expanded = expandedUuids.has(parcel.uuid);
                            const parcelLabel = formatPlanParcel(parcel);
                            const toggleLabel = expanded
                                ? `Masquer l’aperçu de la parcelle ${parcelLabel}`
                                : `Afficher l’aperçu de la parcelle ${parcelLabel}`;
                            const detailsId = `control-plan-parcel-${parcel.uuid}`;

                            return (
                                <React.Fragment key={parcel.uuid}>
                                    <tr className={classes.row} data-parcel-row onClick={() => toggleRow(parcel)}>
                                        {ranked ? (
                                            <td data-label="Rang">
                                                <span className="fr-cell__title">{formatBigInt(parcel.rank)}</span>
                                                {section === 'PROPOSED' && parcel.addedByAgent ? (
                                                    <span
                                                        className={clsx(
                                                            'fr-cell__desc',
                                                            classes.secondary,
                                                            classes.nowrap,
                                                        )}
                                                    >
                                                        Ajoutée
                                                    </span>
                                                ) : null}
                                                {section === 'PLANNED' && parcel.waveNumber ? (
                                                    <span
                                                        className={clsx(
                                                            'fr-cell__desc',
                                                            classes.secondary,
                                                            classes.nowrap,
                                                        )}
                                                    >
                                                        Vague {parcel.waveNumber}
                                                    </span>
                                                ) : null}
                                            </td>
                                        ) : null}
                                        <td data-label="Commune">
                                            {parcel.commune ? (
                                                <>
                                                    <span className={classes.block}>{parcel.commune.name}</span>
                                                    <span className={clsx('fr-cell__desc', classes.secondary)}>
                                                        {parcel.commune.code}
                                                    </span>
                                                </>
                                            ) : (
                                                <OptionalText />
                                            )}
                                        </td>
                                        <td data-label="Parcelle">
                                            <span className="fr-cell__title">{parcelLabel}</span>
                                            <span className={clsx('fr-cell__desc', classes.secondary)}>
                                                {parcel.idParcellaire}
                                            </span>
                                            {parcel.contenance !== null ? (
                                                <span className={clsx('fr-cell__desc', classes.secondary)}>
                                                    {formatBigInt(parcel.contenance)}&nbsp;m²
                                                </span>
                                            ) : null}
                                        </td>
                                        <td data-label="Zones à enjeux" className={classes['cell-wide']}>
                                            <TagsCell labels={parcel.zoneNames} />
                                        </td>
                                        <td
                                            data-label="Objets"
                                            className={clsx(classes['cell-wide'], classes['cell-objects'])}
                                        >
                                            <DetectionCountCell
                                                count={parcel.objectsCount}
                                                countsByObjectType={getObjectTypeCounts(parcel)}
                                                unit={['objet', 'objets']}
                                            />
                                            {parcel.newObjectsCount ? (
                                                <span className={clsx('fr-cell__desc', classes.secondary)}>
                                                    dont {formatCount(parcel.newObjectsCount, 'nouveau', 'nouveaux')}
                                                </span>
                                            ) : null}
                                        </td>
                                        {section === 'PLANNED' ? (
                                            <td data-label="Suivi">
                                                {parcel.followUpStatus ? (
                                                    <p
                                                        className={clsx(
                                                            'fr-badge fr-badge--sm fr-badge--no-icon',
                                                            FOLLOW_UP_BADGE_CLASSES[parcel.followUpStatus],
                                                            classes.badge,
                                                        )}
                                                    >
                                                        {FOLLOW_UP_LABELS[parcel.followUpStatus]}
                                                    </p>
                                                ) : (
                                                    <OptionalText />
                                                )}
                                            </td>
                                        ) : null}
                                        {datedSection ? (
                                            <td data-label={section === 'EXCLUDED' ? 'Écartée le' : 'Retirée le'}>
                                                <OptionalText
                                                    text={
                                                        parcel.statusChangedAt
                                                            ? formatTimestampDay(parcel.statusChangedAt)
                                                            : null
                                                    }
                                                />
                                            </td>
                                        ) : null}
                                        <td className={clsx('fr-cell--right', classes['cell-wide'])}>
                                            <div className={classes['row-end']}>
                                                {renderActions(parcel)}
                                                <button
                                                    type="button"
                                                    className={clsx(
                                                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                                                        expanded
                                                            ? 'fr-icon-arrow-up-s-line'
                                                            : 'fr-icon-arrow-down-s-line',
                                                    )}
                                                    title={toggleLabel}
                                                    aria-expanded={expanded}
                                                    aria-controls={expanded ? detailsId : undefined}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        toggleRow(parcel);
                                                    }}
                                                >
                                                    {toggleLabel}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expanded ? (
                                        <tr id={detailsId} className={classes['details-row']}>
                                            <td colSpan={columnsCount}>
                                                <div className={classes['details-content']}>
                                                    <ParcelPreview parcel={parcel} />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </Table>
            )}

            <p className="fr-sr-only" aria-live="polite">
                {announcement}
            </p>

            <ConfirmModal
                opened={!!parcelToRemove}
                title="Retirer la parcelle du plan"
                confirmLabel="Retirer du plan"
                pending={mutation.isPending}
                error={mutation.isError && mutation.variables?.action === 'remove' ? mutation.error : null}
                errorFallback="La parcelle n’a pas été retirée, veuillez réessayer."
                onConfirm={() => parcelToRemove && mutation.mutate({ parcel: parcelToRemove, action: 'remove' })}
                onClose={() => setParcelToRemove(undefined)}
            >
                <p>
                    {parcelToRemove ? (
                        <>
                            La parcelle <b>{formatPlanParcel(parcelToRemove)}</b>
                            {parcelToRemove.commune ? ` (${parcelToRemove.commune.name})` : ''} sort du plan.
                        </>
                    ) : null}
                </p>
                <p>
                    Ses objets encore «&nbsp;À contrôler&nbsp;» repassent «&nbsp;Non contrôlé&nbsp;», et ceux que le
                    plan avait fait passer de «&nbsp;Non vérifié&nbsp;» à «&nbsp;Suspect&nbsp;» redeviennent «&nbsp;Non
                    vérifié&nbsp;». Une vague suivante ne la proposera plus, sauf si vous la réintégrez.
                </p>
            </ConfirmModal>
        </div>
    );
};

export default Component;
