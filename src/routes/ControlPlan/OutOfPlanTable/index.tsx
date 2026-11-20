import React, { useMemo, useRef } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Pagination from '@/components/dsfr/Pagination';
import Table from '@/components/dsfr/Table';
import Loader from '@/components/ui/Loader';
import { OutOfPlanOrigin, OutOfPlanParcel } from '@/models/control-plan';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import { formatCount, formatPlanParcel, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import DetectionCountCell from '@/routes/Table/DetectionCountCell';
import TagsCell from '@/routes/Table/TagsCell';
import { usePaginatedList } from '@/routes/Table/usePaginatedList';
import { scrollBelowHeader } from '@/utils/html';
import { getDetectionObjectLink } from '@/utils/link';
import { getPaginationPage } from '@/utils/pagination';
import clsx from 'clsx';
import classes from './index.module.scss';

const COLUMNS_COUNT = 6;

const ORIGIN_LABELS: Record<OutOfPlanOrigin['type'], string> = {
    PLAN: 'Plan en cours',
    CLOSED_PLAN: 'Plan clôturé',
    OTHER_GROUP_PLAN: 'Plan d’un autre groupe',
    NONE: 'Sans plan',
};

const renderOrigin = (origin: OutOfPlanOrigin) =>
    origin.type === 'PLAN' || origin.type === 'CLOSED_PLAN' ? (
        <li key={origin.uuid}>
            <span className={classes['origin-name']}>{origin.name}</span>
            <span className={classes.secondary}>{ORIGIN_LABELS[origin.type]}</span>
        </li>
    ) : (
        <li key={origin.type}>{ORIGIN_LABELS[origin.type]}</li>
    );

interface ComponentProps {
    controlPlanUuid: string;
}

// « Autres parcelles à contrôler »: objects « À contrôler » that did not come from this plan, and where from.
const Component: React.FC<ComponentProps> = ({ controlPlanUuid }: ComponentProps) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const endpoint = controlPlanEndpoints.outOfPlan(controlPlanUuid);
    const filter = useMemo(() => ({}), []);
    const { data, isLoading, isFetching, error, pagination, setPagination } = usePaginatedList<
        OutOfPlanParcel,
        typeof filter
    >(endpoint, filter, { initialLimit: 20, enabled: true });
    const paginationPage = getPaginationPage(pagination);

    if (isLoading) {
        return <Loader className={classes.loader} />;
    }

    return (
        <div className={classes.container}>
            <p className={classes.intro}>
                Parcelles de votre territoire dont des objets sont «&nbsp;À&nbsp;contrôler&nbsp;» sans passer par ce
                plan&nbsp;: par un autre plan de votre groupe, en cours ou clôturé, par le plan d’un autre groupe, ou
                sans plan (depuis la carte, le suivi ou un import). La liste d’attente d’une proposition n’en fait pas
                partie&nbsp;: ses parcelles reviennent à la vague suivante.
            </p>
            {error ? (
                <ErrorAlert
                    className="fr-mb-2w"
                    error={error}
                    fallback="La liste des parcelles n’a pas pu être chargée."
                />
            ) : null}
            <Table
                caption="Autres parcelles à contrôler"
                tableRef={tableRef}
                busy={isFetching}
                className={classes.table}
                header={
                    <p className="fr-table__detail">
                        {pagination.total != null ? formatCount(pagination.total, 'parcelle') : null}
                    </p>
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
                        <th scope="col">Commune</th>
                        <th scope="col">Parcelle</th>
                        <th scope="col">
                            <span className={classes.nowrap}>Zones à enjeux</span>
                        </th>
                        <th scope="col">
                            <span className={classes.nowrap}>Objets à contrôler</span>
                        </th>
                        <th scope="col">Origine</th>
                        <th scope="col">
                            <span className="fr-sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data?.length === 0 ? (
                        <tr>
                            <td colSpan={COLUMNS_COUNT}>Aucune autre parcelle à contrôler</td>
                        </tr>
                    ) : null}
                    {data?.map((parcel) => (
                        <tr key={parcel.uuid} className={classes.row}>
                            <td data-label="Commune">{`${parcel.commune.name} (${parcel.commune.code})`}</td>
                            <td data-label="Parcelle">
                                <span className="fr-cell__title">{formatPlanParcel(parcel)}</span>
                                <span className={clsx('fr-cell__desc', classes.secondary)}>{parcel.idParcellaire}</span>
                            </td>
                            <td data-label="Zones à enjeux" className={classes['cell-wide']}>
                                <TagsCell labels={parcel.zoneNames} />
                            </td>
                            <td data-label="Objets à contrôler" className={clsx(classes['cell-wide'], classes.objects)}>
                                <DetectionCountCell
                                    count={parcel.detectionsCount}
                                    countsByObjectType={parcel.detectionsCountByObjectType}
                                    unit={['objet', 'objets']}
                                />
                            </td>
                            <td data-label="Origine" className={classes['cell-wide']}>
                                <ul className={classes.origins}>{parcel.origins.map(renderOrigin)}</ul>
                            </td>
                            <td className={clsx('fr-cell--right', classes['cell-wide'])}>
                                {parcel.detectionObjectUuids.length ? (
                                    <a
                                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-map-pin-2-line fr-btn--icon-left"
                                        href={getDetectionObjectLink(parcel.detectionObjectUuids[0])}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`Voir la parcelle ${formatPlanParcel(parcel)} sur la carte - nouvelle fenêtre`}
                                        onClick={() => trackControlPlanEvent('Carte ouverte', 'OUT_OF_PLAN')}
                                    >
                                        Carte
                                    </a>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

export default Component;
