import React, { ReactElement, useEffect, useState } from 'react';

import SoloAccordion from '@/components/admin/SoloAccordion';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { Paginated, Uuided } from '@/models/data';
import { PAGINATION_OFFSET_LIMIT_INITIAL_VALUE, PaginationOffsetLimit } from '@/models/table';
import api from '@/utils/api';
import { getPaginationPage } from '@/utils/pagination';
import { LoadingOverlay, Pagination, Table } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ComponentProps<T_DATA extends Uuided, T_FILTER extends object> {
    endpoint: string;
    filter: T_FILTER;
    SoloAccordion: ReactElement<typeof SoloAccordion>;
    tableHeader: ReactElement<typeof Table.Th>[];
    tableBodyRenderFns: ((item: T_DATA) => React.ReactNode)[];
    onItemClick?: (item: T_DATA) => void;
}

const Component = <T_DATA extends Uuided, T_FILTER extends object>({
    endpoint,
    filter,
    SoloAccordion,
    tableHeader,
    tableBodyRenderFns,
    onItemClick,
}: ComponentProps<T_DATA, T_FILTER>) => {
    const [pagination, setPagination] = useState<PaginationOffsetLimit>(PAGINATION_OFFSET_LIMIT_INITIAL_VALUE);

    useEffect(() => {
        setPagination(PAGINATION_OFFSET_LIMIT_INITIAL_VALUE);
    }, [endpoint, filter]);

    const fetchData = async (pagination: PaginationOffsetLimit) => {
        const res = await api.get<Paginated<T_DATA>>(endpoint, {
            params: {
                ...pagination,
                ...filter,
            },
        });
        setPagination((pagination) => ({
            ...pagination,
            total: res.data.count,
        }));
        return res.data.results;
    };

    const { isLoading, error, data, isFetching } = useQuery({
        queryKey: [endpoint, pagination.limit, pagination.offset, ...Object.values(filter)],
        queryFn: () => fetchData(pagination),
        placeholderData: keepPreviousData,
    });

    const paginationPage = getPaginationPage(pagination);

    return (
        <>
            <div className={classes['filters-section']}>{SoloAccordion}</div>

            {error ? <ErrorCard className={classes['error-card']}>{error.message}</ErrorCard> : null}

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
