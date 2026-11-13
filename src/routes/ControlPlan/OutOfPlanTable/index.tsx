import React, { useMemo, useRef } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Pagination from '@/components/dsfr/Pagination';
import Table from '@/components/dsfr/Table';
import Loader from '@/components/ui/Loader';
import { OutOfPlanParcel } from '@/models/control-plan';
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

const COLUMNS_COUNT = 5;

interface ComponentProps {
    controlPlanUuid: string;
}

// The parcels with objects « À contrôler » that did not come from the plan: set by hand, by another plan...
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
                Parcelles de votre territoire dont des objets sont «&nbsp;À&nbsp;contrôler&nbsp;» sans être passés par
                ce plan : mis à contrôler depuis la carte ou le tableau, par le plan d’un autre groupe ou par un plan
                précédent.
            </p>
            {error ? (
                <ErrorAlert
                    className="fr-mb-2w"
                    error={error}
                    fallback="La liste des parcelles n’a pas pu être chargée."
                />
            ) : null}
            <Table
                caption="Parcelles à contrôler hors plan"
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
                        <th scope="col">Zones à enjeux</th>
                        <th scope="col">Objets à contrôler</th>
                        <th scope="col">
                            <span className="fr-sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data?.length === 0 ? (
                        <tr>
                            <td colSpan={COLUMNS_COUNT}>Aucune parcelle à contrôler hors plan</td>
                        </tr>
                    ) : null}
                    {data?.map((parcel) => (
                        <tr key={parcel.uuid} className={classes.row}>
                            <td data-label="Commune">{`${parcel.commune.name} (${parcel.commune.code})`}</td>
                            <td data-label="Parcelle">
                                <span className="fr-cell__title">{formatPlanParcel(parcel)}</span>
                                <span className={clsx('fr-cell__desc', classes.secondary)}>{parcel.idParcellaire}</span>
                                <p className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--purple-glycine fr-mt-1v">
                                    Hors plan
                                </p>
                            </td>
                            <td data-label="Zones à enjeux" className={classes['cell-wide']}>
                                <TagsCell labels={parcel.zoneNames} />
                            </td>
                            <td data-label="Objets à contrôler" className={classes['cell-wide']}>
                                <DetectionCountCell
                                    count={parcel.detectionsCount}
                                    countsByObjectType={parcel.detectionsCountByObjectType}
                                    unit={['objet', 'objets']}
                                />
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
