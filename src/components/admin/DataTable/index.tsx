import React, { ReactElement, ReactNode, useEffect, useState } from 'react';

import SoloAccordion from '@/components/admin/SoloAccordion';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { Paginated, Uuided } from '@/models/data';
import { PAGINATION_OFFSET_LIMIT_INITIAL_VALUE, PaginationOffsetLimit } from '@/models/table';
import api from '@/utils/api';
import { getPaginationPage } from '@/utils/pagination';
import { LoadingOverlay, Pagination, Select, Table } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

const LIMITS: (typeof PAGINATION_OFFSET_LIMIT_INITIAL_VALUE.limit)[] = [5, 10, 20, 50];

interface ComponentProps<T_DATA extends Uuided, T_FILTER extends object> {
    endpoint: string;
    filter: T_FILTER;
    SoloAccordion: ReactElement<typeof SoloAccordion>;
    tableHeader: ReactElement<typeof Table.Th>[];
    tableBodyRenderFns: ((item: T_DATA) => React.ReactNode)[];
    beforeTable?: ReactNode;
    onItemClick?: (item: T_DATA) => void;
    initialLimit?: number;
}

const Component = <T_DATA extends Uuided, T_FILTER extends object>({
    endpoint,
    filter,
    SoloAccordion,
    tableHeader,
    tableBodyRenderFns,
    beforeTable,
    onItemClick,
    initialLimit = PAGINATION_OFFSET_LIMIT_INITIAL_VALUE.limit,
}: ComponentProps<T_DATA, T_FILTER>) => {
    const [pagination, setPagination] = useState<PaginationOffsetLimit>({
        ...PAGINATION_OFFSET_LIMIT_INITIAL_VALUE,
        limit: initialLimit,
    });

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            offset: 0,
            total: undefined,
        }));
    }, [endpoint, filter, pagination.limit]);

    const fetchData = async (signal: AbortSignal, pagination: PaginationOffsetLimit) => {
        const res = await api.get<Paginated<T_DATA>>(endpoint, {
            params: {
                ...pagination,
                ...filter,
            },
            signal,
        });
        setPagination((pagination) => ({
            ...pagination,
            total: res.data.count,
        }));
        return res.data.results;
    };

    const { isLoading, error, data, isFetching } = useQuery({
        queryKey: [endpoint, pagination.limit, pagination.offset, ...Object.values(filter)],
        queryFn: ({ signal }) => fetchData(signal, pagination),
        placeholderData: keepPreviousData,
    });

    const paginationPage = getPaginationPage(pagination);

    return (
        <>
            <div className={classes['filters-section']}>{SoloAccordion}</div>

            {error ? <ErrorCard className={classes['error-card']}>{error.message}</ErrorCard> : null}

            {beforeTable ? <div className={classes['before-table-container']}>{beforeTable}</div> : null}

            <div className={classes['table-header']}>
                <div>
                    {pagination.total != null ? (
                        <p className={classes['table-infos']}>
                            Nombre de résultats: {Math.min(pagination.limit + pagination.offset, pagination.total)}/
                            {pagination.total} ({pagination.limit} par page)
                        </p>
                    ) : null}
                </div>

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
            </div>

            <div className={classes['table-container']}>
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <LoadingOverlay visible={isFetching}>
                            <Loader />
                        </LoadingOverlay>
                        <Table
                            striped
                            highlightOnHover
                            className={clsx(classes.table, { [classes['items-clickable']]: !!onItemClick })}
                            layout="fixed"
                        >
                            <Table.Thead>
                                <Table.Tr>{tableHeader}</Table.Tr>
                            </Table.Thead>

                            <Table.Tbody>
                                {data?.length === 0 ? (
                                    <Table.Tr>
                                        <Table.Td className="empty-results-cell" colSpan={tableHeader.length}>
                                            Aucun résultat
                                        </Table.Td>
                                    </Table.Tr>
                                ) : null}
                                {data?.map((item) => (
                                    <Table.Tr key={item.uuid}>
                                        {tableBodyRenderFns.map((renderFn, index) => (
                                            <Table.Td
                                                key={index}
                                                onClick={onItemClick ? () => onItemClick(item) : undefined}
                                            >
                                                {renderFn(item)}
                                            </Table.Td>
                                        ))}
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </>
                )}
            </div>

            {paginationPage ? (
                <Pagination
                    className={classes.pagination}
                    value={paginationPage.currentPage}
                    onChange={(page: number) =>
                        setPagination((prev) => ({
                            ...prev,
                            offset: (page - 1) * prev.limit,
                        }))
                    }
                    total={paginationPage.totalPages}
                />
            ) : null}
        </>
    );
};

export default Component;
