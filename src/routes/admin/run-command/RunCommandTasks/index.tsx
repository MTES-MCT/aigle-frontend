import React from 'react';

import { RUN_COMMAND_TASKS_ENDPOINT } from '@/api-endpoints';
import dataTableClasses from '@/components/admin/DataTable/index.module.scss';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { CommandTask } from '@/models/command';
import { Paginated } from '@/models/data';
import api from '@/utils/api';
import { LoadingOverlay, Table } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

const Component: React.FC = () => {
    const fetchData = async () => {
        const res = await api.get<Omit<Paginated<CommandTask>, 'previous' | 'next'>>(RUN_COMMAND_TASKS_ENDPOINT);
        return res.data;
    };
    const { isLoading, error, data, isFetching } = useQuery({
        queryKey: [RUN_COMMAND_TASKS_ENDPOINT],
        queryFn: () => fetchData(),
    });

    return (
        <>
            {error ? <ErrorCard>{error.message}</ErrorCard> : null}
            <div className={dataTableClasses['table-container']}>
                {isLoading ? (
                    <Loader />
                ) : (
                    <Table striped highlightOnHover className={dataTableClasses.table}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th key="taskId">ID</Table.Th>
                                <Table.Th key="name">Nom</Table.Th>
                                <Table.Th key="kwargs">Arguments</Table.Th>
                                <Table.Th key="status">Statut</Table.Th>
                            </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                            <LoadingOverlay visible={isFetching || isLoading}>
                                <Loader />
                            </LoadingOverlay>
                            {data?.count === 0 ? (
                                <Table.Tr>
                                    <Table.Td className="empty-results-cell" colSpan={4}>
                                        Aucun résultat
                                    </Table.Td>
                                </Table.Tr>
                            ) : null}
                            {data?.results.map((item) => (
                                <Table.Tr key={item.taskId}>
                                    <Table.Td>{item.taskId}</Table.Td>
                                    <Table.Td>{item.name}</Table.Td>
                                    <Table.Td>{String(item.kwargs)}</Table.Td>
                                    <Table.Td>{item.status}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </div>
        </>
    );
};

export default Component;
