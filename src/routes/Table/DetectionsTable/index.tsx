import { detectionEndpoints } from '@/api/endpoints';
import Table, { SortOrder, TableSortHeader } from '@/components/dsfr/Table';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { DetectionListItem } from '@/models/detection';
import ObjectTypeSquare from '@/routes/Table/ObjectTypeSquare';
import TagsCell from '@/routes/Table/TagsCell';
import { DataTableFilter } from '@/routes/Table/utils';
import api from '@/utils/api';
import {
    DETECTION_CONTROL_STATUSES_BADGE_CLASSES,
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_PRESCRIPTION_STATUSES_BADGE_CLASSES,
    DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_BADGE_CLASSES,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { getDetectionObjectLink } from '@/utils/link';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

const ENDPOINT = detectionEndpoints.getList();

interface FieldOrder {
    sortOrder?: SortOrder;
    field: string;
}

interface ParcelDataTableFilter extends DataTableFilter {
    parcelsUuids: string[];
    ordering?: string;
}

// Opens the map in a new tab: same-host links are invisible to Matomo's link tracking.
const trackOpenOnMap = (item: DetectionListItem) =>
    trackEvent(
        TRACKING_CATEGORIES.table,
        'Objet ouvert sur la carte',
        `${item.detectionValidationStatus} / ${item.detectionControlStatus}`,
    );

const Badge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
    <p className={clsx('fr-badge fr-badge--sm fr-badge--no-icon', className)}>{label}</p>
);

interface ComponentProps {
    parcelUuid: string;
    dataTableFilter: DataTableFilter;
    selectionShowed: boolean;
    selectedUuids: string[];
    setSelectedUuids: React.Dispatch<React.SetStateAction<string[]>>;
}

const Component: React.FC<ComponentProps> = ({
    parcelUuid,
    dataTableFilter,
    selectionShowed,
    selectedUuids,
    setSelectedUuids,
}: ComponentProps) => {
    const checkboxIdPrefix = `detection-select-${useId()}`;
    const [order, setOrder] = React.useState<FieldOrder | undefined>();
    const filter: ParcelDataTableFilter = {
        ...dataTableFilter,
        parcelsUuids: [parcelUuid],
        ...(order ? { ordering: order.sortOrder === 'asc' ? order.field : `-${order.field}` } : {}),
    };

    // same key shape as the shared DataTable: the bulk edit invalidates the `[ENDPOINT]` prefix
    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: [ENDPOINT, ...Object.values(filter)],
        queryFn: ({ signal }) => api<DetectionListItem[]>(ENDPOINT, { params: { ...filter }, signal }),
        placeholderData: keepPreviousData,
    });

    if (error) {
        return (
            <div className="fr-alert fr-alert--error fr-alert--sm" role="alert">
                <p>{error.message}</p>
            </div>
        );
    }

    if (isLoading || !data) {
        return <Loader />;
    }

    const colsCount = 8 + (selectionShowed ? 1 : 0);

    return (
        <Table caption="Détections de la parcelle" size="sm" bordered busy={isFetching} className={classes.table}>
            <thead>
                <tr>
                    {selectionShowed ? (
                        <th scope="col" className="fr-cell--fixed">
                            <span className="fr-sr-only">Sélection</span>
                        </th>
                    ) : null}
                    <th scope="col">Objet n°</th>
                    <th scope="col">Commune</th>
                    <th scope="col">Zones à enjeux</th>
                    <th scope="col">Type</th>
                    <th scope="col">Millésime</th>
                    <TableSortHeader
                        sortOrder={order?.field === 'detectionControlStatus' ? order.sortOrder : undefined}
                        onOrderChange={(sortOrder?: SortOrder) =>
                            setOrder(sortOrder ? { sortOrder, field: 'detectionControlStatus' } : undefined)
                        }
                    >
                        Statut de contrôle
                    </TableSortHeader>
                    <th scope="col">Prescription</th>
                    <th scope="col">Statut de validation</th>
                </tr>
            </thead>
            <tbody>
                {!data.length ? (
                    <tr>
                        <td colSpan={colsCount}>Aucun résultat</td>
                    </tr>
                ) : null}
                {data.map((item) => {
                    const selected = selectedUuids.includes(item.uuid);
                    const checkboxId = `${checkboxIdPrefix}-${item.uuid}`;

                    return (
                        <tr key={item.uuid} aria-selected={selectionShowed ? selected : undefined}>
                            {selectionShowed ? (
                                <td className="fr-cell--fixed">
                                    <div className="fr-checkbox-group fr-checkbox-group--sm">
                                        <input
                                            type="checkbox"
                                            id={checkboxId}
                                            checked={selected}
                                            onChange={(event) => {
                                                const { checked } = event.currentTarget;
                                                setSelectedUuids((uuids) =>
                                                    checked
                                                        ? [...uuids, item.uuid]
                                                        : uuids.filter((uuid) => uuid !== item.uuid),
                                                );
                                            }}
                                        />
                                        <label className="fr-label" htmlFor={checkboxId}>
                                            {`Sélectionner l’objet n°${item.detectionObjectId}`}
                                        </label>
                                    </div>
                                </td>
                            ) : null}
                            <td className={classes.nowrap}>
                                <Link
                                    className="fr-link fr-link--sm"
                                    target="_blank"
                                    title={`Ouvrir l’objet n°${item.detectionObjectId} sur la carte - nouvelle fenêtre`}
                                    to={getDetectionObjectLink(item.detectionObjectUuid)}
                                    onClick={() => trackOpenOnMap(item)}
                                    onAuxClick={(event: React.MouseEvent) => {
                                        // Middle click: browsers send it as auxclick only, never as click.
                                        if (event.button === 1) {
                                            trackOpenOnMap(item);
                                        }
                                    }}
                                >
                                    {item.detectionObjectId}
                                </Link>
                            </td>
                            <td>
                                <OptionalText text={`${item.communeName} (${item.communeIsoCode})`} />
                            </td>
                            <td>
                                <TagsCell
                                    labels={item.geoCustomZones.map(
                                        (zone) => zone.geoCustomZoneCategory?.name || zone.name,
                                    )}
                                />
                            </td>
                            <td>
                                <span className={classes['object-type']}>
                                    <ObjectTypeSquare color={item.objectType.color} />
                                    {item.objectType.name}
                                </span>
                            </td>
                            <td>
                                <TagsCell labels={item.tileSets.map((tileSet) => tileSet.name)} />
                            </td>
                            <td className={classes.nowrap}>
                                <Badge
                                    label={DETECTION_CONTROL_STATUSES_NAMES_MAP[item.detectionControlStatus]}
                                    className={DETECTION_CONTROL_STATUSES_BADGE_CLASSES[item.detectionControlStatus]}
                                />
                            </td>
                            <td className={classes.nowrap}>
                                <Badge
                                    label={
                                        DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP[
                                            item.detectionPrescriptionStatus || 'NOT_PRESCRIBED'
                                        ]
                                    }
                                    className={
                                        DETECTION_PRESCRIPTION_STATUSES_BADGE_CLASSES[
                                            item.detectionPrescriptionStatus || 'NOT_PRESCRIBED'
                                        ]
                                    }
                                />
                            </td>
                            <td className={classes.nowrap}>
                                <Badge
                                    label={DETECTION_VALIDATION_STATUSES_NAMES_MAP[item.detectionValidationStatus]}
                                    className={
                                        DETECTION_VALIDATION_STATUSES_BADGE_CLASSES[item.detectionValidationStatus]
                                    }
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};

export default Component;
