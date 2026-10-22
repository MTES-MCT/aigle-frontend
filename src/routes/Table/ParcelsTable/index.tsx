import React, { useRef, useState } from 'react';

import Pagination from '@/components/dsfr/Pagination';
import Select from '@/components/dsfr/Select';
import Table, { SortOrder, TableSortHeader } from '@/components/dsfr/Table';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { ParcelListItem } from '@/models/parcel';
import DetectionCountCell from '@/routes/Table/DetectionCountCell';
import TagsCell from '@/routes/Table/TagsCell';
import { usePaginatedList } from '@/routes/Table/usePaginatedList';
import { HEADER_HEIGHT_PX } from '@/utils/constants';
import { formatBigInt, formatParcel } from '@/utils/format';
import { getPaginationPage } from '@/utils/pagination';
import clsx from 'clsx';
import classes from './index.module.scss';

const LIMITS = [5, 10, 20, 50];

export type ParcelsSortField = 'detectionsCount' | 'parcel';

export interface ParcelsOrder {
    sortOrder?: SortOrder;
    field: ParcelsSortField;
}

const scrollToTable = (table: HTMLTableElement | null) => {
    if (table) {
        window.scrollTo({
            top: table.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT_PX,
            behavior: 'smooth',
        });
    }
};

interface ComponentProps<T_FILTER extends object> {
    endpoint: string;
    filter: T_FILTER;
    queryEnabled: boolean;
    initialLimit: number;
    order?: ParcelsOrder;
    onOrderChange: (field: ParcelsSortField, sortOrder?: SortOrder) => void;
    getExpandedContent: (item: ParcelListItem) => React.ReactNode;
    // a row the user expands (collapses are not reported), with its 1-based rank in the whole list
    onRowExpand: (item: ParcelListItem, rank: number) => void;
    onDataSettled: (items: ParcelListItem[]) => void;
}

const COLS_COUNT = 5;

const Component = <T_FILTER extends object>({
    endpoint,
    filter,
    queryEnabled,
    initialLimit,
    order,
    onOrderChange,
    getExpandedContent,
    onRowExpand,
    onDataSettled,
}: ComponentProps<T_FILTER>) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const [rowsExpanded, setRowsExpanded] = useState<Set<string>>(new Set());
    const { data, isLoading, isFetching, error, refetch, pagination, setPagination } = usePaginatedList<
        ParcelListItem,
        T_FILTER
    >(endpoint, filter, { initialLimit, enabled: queryEnabled, onDataSettled });

    const paginationPage = getPaginationPage(pagination);

    const toggleRow = (item: ParcelListItem, index: number) => {
        // read here, not in the updater: StrictMode runs updaters twice
        if (!rowsExpanded.has(item.uuid)) {
            onRowExpand(item, pagination.offset + index + 1);
        }
        setRowsExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(item.uuid)) {
                next.delete(item.uuid);
            } else {
                next.add(item.uuid);
            }
            return next;
        });
    };

    if (!queryEnabled) {
        return <p className={classes.placeholder}>Vos données vont s&apos;afficher ici.</p>;
    }

    if (isLoading) {
        return <Loader className={classes.loader} />;
    }

    const shownCount =
        pagination.total != null ? Math.min(pagination.limit + pagination.offset, pagination.total) : undefined;

    return (
        <>
            {error ? (
                <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
                    <p>{error.message}</p>
                </div>
            ) : null}

            <Table
                caption="Parcelles du périmètre"
                tableRef={tableRef}
                busy={isFetching}
                className={classes.table}
                header={
                    <>
                        <p className="fr-table__detail">
                            {pagination.total != null && shownCount != null
                                ? `Nombre de résultats : ${formatBigInt(shownCount)}/${formatBigInt(pagination.total)} (${pagination.limit} par page)`
                                : null}
                        </p>
                        <button
                            type="button"
                            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-refresh-line"
                            title="Rafraîchir la liste"
                            onClick={() => refetch({ cancelRefetch: true })}
                        >
                            Rafraîchir la liste
                        </button>
                    </>
                }
                footerStart={
                    <Select
                        label="Nombre de lignes par page"
                        labelHidden
                        className={classes['limit-select']}
                        value={String(pagination.limit)}
                        options={LIMITS.map((limit) => ({ value: String(limit), label: `${limit} lignes par page` }))}
                        onChange={(limit) => setPagination((prev) => ({ ...prev, limit: Number(limit) }))}
                    />
                }
                footerMiddle={
                    paginationPage ? (
                        <Pagination
                            page={paginationPage.currentPage}
                            totalPages={paginationPage.totalPages}
                            onChange={(page) => {
                                setPagination((prev) => ({ ...prev, offset: (page - 1) * prev.limit }));
                                scrollToTable(tableRef.current);
                            }}
                        />
                    ) : null
                }
            >
                <thead>
                    <tr>
                        <th scope="col">Commune</th>
                        <th scope="col">Zones à enjeux</th>
                        <TableSortHeader
                            sortOrder={order?.field === 'detectionsCount' ? order.sortOrder : undefined}
                            onOrderChange={(sortOrder) => onOrderChange('detectionsCount', sortOrder)}
                        >
                            Nombre de détections
                        </TableSortHeader>
                        <TableSortHeader
                            sortOrder={order?.field === 'parcel' ? order.sortOrder : undefined}
                            onOrderChange={(sortOrder) => onOrderChange('parcel', sortOrder)}
                        >
                            Parcelle
                        </TableSortHeader>
                        <th scope="col">
                            <span className="fr-sr-only">Détections de la parcelle</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data?.length === 0 ? (
                        <tr>
                            <td colSpan={COLS_COUNT}>Aucun résultat</td>
                        </tr>
                    ) : null}
                    {data?.map((item, index) => {
                        const expanded = rowsExpanded.has(item.uuid);
                        const parcelLabel = formatParcel(item, false);
                        const toggleLabel = expanded
                            ? `Masquer les détections de la parcelle ${parcelLabel}`
                            : `Afficher les détections de la parcelle ${parcelLabel}`;
                        const detailsId = `parcel-detections-${item.uuid}`;

                        return (
                            <React.Fragment key={item.uuid}>
                                <tr
                                    className={clsx(classes.row, expanded && classes['row-expanded'])}
                                    onClick={() => toggleRow(item, index)}
                                >
                                    <td>
                                        <OptionalText text={`${item.commune.name} (${item.commune.code})`} />
                                    </td>
                                    <td>
                                        <TagsCell labels={item.zoneNames} />
                                    </td>
                                    <td>
                                        <DetectionCountCell parcel={item} />
                                    </td>
                                    <td>
                                        <OptionalText
                                            text={
                                                parcelLabel ? (
                                                    <>
                                                        <span className="fr-cell__title">{parcelLabel}</span>
                                                        <span className={clsx('fr-cell__desc', classes['parcel-id'])}>
                                                            {item.idParcellaire}
                                                        </span>
                                                    </>
                                                ) : null
                                            }
                                        />
                                    </td>
                                    <td className="fr-cell--right">
                                        <button
                                            type="button"
                                            className={clsx(
                                                'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                                                expanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line',
                                            )}
                                            title={toggleLabel}
                                            aria-expanded={expanded}
                                            aria-controls={expanded ? detailsId : undefined}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                toggleRow(item, index);
                                            }}
                                        >
                                            {toggleLabel}
                                        </button>
                                    </td>
                                </tr>
                                {expanded ? (
                                    <tr id={detailsId} className={classes['details-row']}>
                                        <td colSpan={COLS_COUNT}>
                                            <div className={classes['details-content']}>{getExpandedContent(item)}</div>
                                        </td>
                                    </tr>
                                ) : null}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </Table>
        </>
    );
};

export default Component;
