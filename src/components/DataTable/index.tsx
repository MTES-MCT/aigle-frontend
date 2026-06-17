import React, { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';

import SoloAccordion from '@/components/SoloAccordion';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { Paginated, Uuided } from '@/models/data';
import { PAGINATION_OFFSET_LIMIT_INITIAL_VALUE, PaginationOffsetLimit } from '@/models/table';
import api from '@/utils/api';
import { getPaginationPage } from '@/utils/pagination';
import {
    ActionIcon,
    Checkbox,
    Flex,
    LoadingOverlay,
    Loader as MantineLoader,
    Pagination,
    Select,
    Table,
    TableProps,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

const REFETCH_INTERVAL_OPTIONS = [
    { value: '0', label: 'Désactivé' },
    { value: '5000', label: '5 secondes' },
    { value: '30000', label: '30 secondes' },
    { value: '60000', label: '1 minute' },
    { value: '300000', label: '5 minutes' },
];

const REFETCH_INTERVAL_PRESET_MS = [5000, 30000, 60000, 300000];

const snapToPreset = (interval: number | false): number | false => {
    if (interval === false || interval <= 0) {
        return false;
    }
    return REFETCH_INTERVAL_PRESET_MS.reduce((closest, preset) =>
        Math.abs(preset - interval) < Math.abs(closest - interval) ? preset : closest,
    );
};

const intervalToSelectValue = (interval: number | false): string => (interval === false ? '0' : String(interval));

const selectValueToInterval = (value: string | null): number | false => {
    if (!value || value === '0') {
        return false;
    }
    return Number(value);
};

const scrollToTable = (tableRef: React.RefObject<HTMLTableElement>) => {
    if (tableRef.current) {
        const yOffset = -116.5; // $header-height
        const y = tableRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;

        window.scrollTo({
            top: y,
            behavior: 'smooth',
        });
    }
};

const LIMITS: (typeof PAGINATION_OFFSET_LIMIT_INITIAL_VALUE.limit)[] = [5, 10, 20, 50];

interface ComponentProps<T_DATA extends Uuided, T_FILTER extends object | undefined> {
    endpoint: string;
    filter?: T_FILTER;
    SoloAccordion?: ReactElement<typeof SoloAccordion>;
    tableHeader: ReactElement<typeof Table.Th>[];
    tableBodyRenderFns: ((item: T_DATA) => React.ReactNode)[];
    beforeTable?: ReactNode;
    onItemClick?: (item: T_DATA) => void;
    initialLimit?: number;
    queryEnabled?: boolean;
    paginated?: boolean;
    tableContainerClassName?: string;
    layout?: TableProps['layout'];
    showSelection?: boolean;
    showRefresh?: boolean;
    selectedUuids?: string[];
    setSelectedUuids?: React.Dispatch<React.SetStateAction<string[]>>;
    getExpandedContent?: (item: T_DATA) => React.ReactNode;
    striped?: boolean;
    highlightOnHover?: boolean;
    // When defined, renders the auto-refresh picker; value is the initial cadence (snapped to nearest preset).
    refetchInterval?: number | false;
}

const Component = <T_DATA extends Uuided, T_FILTER extends object | undefined>({
    endpoint,
    filter,
    SoloAccordion,
    tableHeader,
    tableBodyRenderFns,
    beforeTable,
    onItemClick,
    selectedUuids,
    setSelectedUuids,
    getExpandedContent,
    tableContainerClassName,
    queryEnabled = true,
    paginated = true,
    layout = 'fixed',
    initialLimit = PAGINATION_OFFSET_LIMIT_INITIAL_VALUE.limit,
    showSelection = false,
    showRefresh = true,
    striped = true,
    highlightOnHover = true,
    refetchInterval,
}: ComponentProps<T_DATA, T_FILTER>) => {
    const [pagination, setPagination] = useState<PaginationOffsetLimit>({
        ...PAGINATION_OFFSET_LIMIT_INITIAL_VALUE,
        limit: initialLimit,
    });
    const tableRef = useRef<HTMLTableElement>(null);
    const [rowsExpanded, setRowsExpanded] = useState<Set<string>>(new Set());

    const refetchControlShown = refetchInterval !== undefined;
    const [userRefetchInterval, setUserRefetchInterval] = useState<number | false>(() =>
        refetchInterval === undefined ? false : snapToPreset(refetchInterval),
    );

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            offset: 0,
            total: undefined,
        }));
    }, [endpoint, filter, pagination.limit]);

    const fetchData = async (signal: AbortSignal, pagination: PaginationOffsetLimit) => {
        if (paginated) {
            const res = await api<Paginated<T_DATA>>(endpoint, {
                params: {
                    ...pagination,
                    ...filter,
                },
                signal,
            });
            setPagination((pagination) => ({
                ...pagination,
                total: res.count,
            }));
            return res.results;
        } else {
            return api<T_DATA[]>(endpoint, {
                params: {
                    ...filter,
                },
                signal,
            });
        }
    };

    const { isLoading, error, data, isFetching, refetch } = useQuery({
        queryKey: [endpoint, pagination.limit, pagination.offset, ...(filter ? Object.values(filter) : [])],
        queryFn: ({ signal }) => fetchData(signal, pagination),
        placeholderData: keepPreviousData,
        enabled: queryEnabled,
        refetchInterval: refetchControlShown ? userRefetchInterval : false,
    });

    const paginationPage = getPaginationPage(pagination);
    const colsCount = showSelection ? tableHeader.length + 1 : tableHeader.length;

    return (
        <>
            {SoloAccordion ? <div className={classes['filters-section']}>{SoloAccordion}</div> : null}

            {error ? <ErrorCard className={classes['error-card']}>{error.message}</ErrorCard> : null}

            {beforeTable ? <div className={classes['before-table-container']}>{beforeTable}</div> : null}

            <div className={classes['table-header']}>
                <div>
                    {paginated && pagination.total != null ? (
                        <p className={classes['table-infos']}>
                            Nombre de résultats: {Math.min(pagination.limit + pagination.offset, pagination.total)}/
                            {pagination.total} ({pagination.limit} par page)
                        </p>
                    ) : null}
                </div>
                {showRefresh || paginated || refetchControlShown ? (
                    <Flex gap="xs" align="flex-end" justify="flex-end">
                        {refetchControlShown ? (
                            <Flex gap="xs" align="center" className={classes['refetch-control']} aria-live="polite">
                                <div className={classes['refetch-loader']}>
                                    {isFetching ? <MantineLoader size="xs" /> : null}
                                </div>
                                <Select
                                    label="Rafraîchissement auto"
                                    data={REFETCH_INTERVAL_OPTIONS}
                                    value={intervalToSelectValue(userRefetchInterval)}
                                    onChange={(value) => setUserRefetchInterval(selectValueToInterval(value))}
                                    allowDeselect={false}
                                />
                            </Flex>
                        ) : null}
                        {showRefresh ? (
                            <ActionIcon
                                variant="subtle"
                                onClick={() => refetch({ cancelRefetch: true })}
                                title="Rafraichir la liste"
                                size="lg"
                            >
                                <IconRefresh />
                            </ActionIcon>
                        ) : null}
                        {paginated ? (
                            <Select
                                label="Nombre de lignes"
                                className={classes['select-limit']}
                                data={LIMITS.map(String)}
                                value={String(pagination.limit)}
                                onChange={(limit) =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        limit: Number(limit),
                                    }))
                                }
                            />
                        ) : null}
                    </Flex>
                ) : null}
            </div>

            {queryEnabled ? (
                <div className={clsx(classes['table-container'], tableContainerClassName)}>
                    {isLoading ? (
                        <Loader className={classes.loader} />
                    ) : (
                        <>
                            <Table
                                highlightOnHover={highlightOnHover}
                                striped={striped}
                                className={clsx(classes.table, {
                                    [classes['items-clickable']]: !!onItemClick,
                                })}
                                layout={layout}
                                ref={tableRef}
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        {showSelection ? [<Table.Th key="select-row" />, ...tableHeader] : tableHeader}
                                    </Table.Tr>
                                </Table.Thead>

                                <Table.Tbody>
                                    <LoadingOverlay visible={isFetching && !refetchControlShown}>
                                        <Loader />
                                    </LoadingOverlay>
                                    {data?.length === 0 ? (
                                        <Table.Tr>
                                            <Table.Td className="empty-results-cell" colSpan={colsCount}>
                                                Aucun résultat
                                            </Table.Td>
                                        </Table.Tr>
                                    ) : null}
                                    {data?.map((item) => (
                                        <React.Fragment key={item.uuid}>
                                            <Table.Tr
                                                bg={
                                                    (selectedUuids || []).includes(item.uuid)
                                                        ? 'var(--mantine-primary-color-light)'
                                                        : undefined
                                                }
                                                className={clsx(classes['table-row'], {
                                                    [classes['row-clickable']]: !!onItemClick || !!getExpandedContent,
                                                })}
                                            >
                                                {showSelection ? (
                                                    <Table.Td>
                                                        <Checkbox
                                                            aria-label="Selectionner l'élément"
                                                            checked={(selectedUuids || []).includes(item.uuid)}
                                                            onChange={(event) =>
                                                                setSelectedUuids &&
                                                                setSelectedUuids((uuids) =>
                                                                    event.currentTarget.checked
                                                                        ? [...uuids, item.uuid]
                                                                        : uuids.filter((uuid) => uuid !== item.uuid),
                                                                )
                                                            }
                                                        />
                                                    </Table.Td>
                                                ) : null}
                                                {tableBodyRenderFns.map((renderFn, cellIndex) => (
                                                    <Table.Td
                                                        key={cellIndex}
                                                        onClick={
                                                            onItemClick || getExpandedContent
                                                                ? () => {
                                                                      onItemClick && onItemClick(item);

                                                                      if (getExpandedContent) {
                                                                          setRowsExpanded((prev) => {
                                                                              const newSet = new Set(prev);
                                                                              if (newSet.has(item.uuid)) {
                                                                                  newSet.delete(item.uuid);
                                                                              } else {
                                                                                  newSet.add(item.uuid);
                                                                              }
                                                                              return newSet;
                                                                          });
                                                                      }
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {renderFn(item)}
                                                    </Table.Td>
                                                ))}
                                            </Table.Tr>
                                            {rowsExpanded.has(item.uuid) ? (
                                                <Table.Tr>
                                                    <Table.Td colSpan={colsCount}>
                                                        {getExpandedContent && getExpandedContent(item)}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </>
                    )}
                </div>
            ) : (
                <div>Vos données vont s&apos;afficher ici.</div>
            )}

            {paginated && paginationPage ? (
                <Pagination
                    className={classes.pagination}
                    value={paginationPage.currentPage}
                    onChange={(page: number) => {
                        setPagination((prev) => ({
                            ...prev,
                            offset: (page - 1) * prev.limit,
                        }));
                        scrollToTable(tableRef);
                    }}
                    total={paginationPage.totalPages}
                />
            ) : null}
        </>
    );
};

export default Component;
