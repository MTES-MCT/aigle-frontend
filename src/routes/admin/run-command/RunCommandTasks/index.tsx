import React, { useState } from 'react';

import { runCommandEndpoints } from '@/api/endpoints';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { CommandRun, CommandRunStatus, commandRunStatuses } from '@/models/command';
import api from '@/utils/api';
import { colors } from '@/utils/colors';
import { ActionIcon, Badge, Checkbox, Stack, Table, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCancel } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { isEqual } from 'lodash';

interface ArgumentsDisplayProps {
    arguments: CommandRun['arguments'];
}

const ArgumentsDisplay: React.FC<ArgumentsDisplayProps> = ({ arguments: args }) => {
    const hasKwargs = Object.keys(args.kwargs).length > 0;
    const hasArgs = args.args.length > 0;

    if (!hasKwargs && !hasArgs) {
        return (
            <Text size="sm" c="dimmed">
                Aucun argument
            </Text>
        );
    }

    return (
        <Stack gap="xs">
            {hasKwargs && (
                <div>
                    <Text size="xs" fw={500} c="dimmed" mb={4}>
                        Arguments nommés:
                    </Text>
                    <ul>
                        {Object.entries(args.kwargs).map(([key, value]) => (
                            <li key={key}>
                                {key}: {String(value)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {hasArgs && (
                <div>
                    <Text size="xs" fw={500} c="dimmed" mb={4}>
                        Arguments positionnels:
                    </Text>
                    <ul>
                        {args.args.map((arg, index) => (
                            <li key={index}>{String(arg)}</li>
                        ))}
                    </ul>
                </div>
            )}
        </Stack>
    );
};

interface StatusBadgeProps {
    status: CommandRunStatus;
}

const COMMAND_RUN_STATUS_COLORS_MAP: Record<CommandRunStatus, string> = {
    PENDING: colors.BLUE,
    RUNNING: colors.YELLOW,
    SUCCESS: colors.GREEN,
    ERROR: colors.RED,
    CANCELED: colors.GREY,
};

const COMMAND_RUN_STATUS_NAMES_MAP: Record<CommandRunStatus, string> = {
    PENDING: 'En attente',
    RUNNING: 'En cours',
    SUCCESS: 'Succès',
    ERROR: 'Erreur',
    CANCELED: 'Annulé',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    return (
        <Badge color={COMMAND_RUN_STATUS_COLORS_MAP[status]} variant="filled">
            {COMMAND_RUN_STATUS_NAMES_MAP[status]}
        </Badge>
    );
};

const cancelTask = async (taskId: string) => {
    const response = await api.post(runCommandEndpoints.cancel(taskId));

    return response.data;
};

interface DataFilter {
    statuses: CommandRunStatus[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    statuses: [...commandRunStatuses].sort(),
};

const Component: React.FC = () => {
    const mutation: UseMutationResult<string, AxiosError, string> = useMutation({
        mutationFn: (taskId: string) => cancelTask(taskId),
        onSuccess: () => {
            notifications.show({
                title: 'La tâche a été annulée',
                message: 'La tâche a été annulée avec succès.',
            });
        },
        onError: (error) => {
            notifications.show({
                title: "Erreur lors de l'annulation de la tâche",
                message: String(error.response?.data) || "Une erreur est survenue lors de l'annulation de la tâche.",
            });
        },
    });
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    return (
        <DataTable<CommandRun, DataFilter>
            endpoint={runCommandEndpoints.tasks}
            filter={filter}
            SoloAccordion={
                <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                    <Checkbox.Group
                        label="Rôles"
                        value={filter.statuses}
                        onChange={(statuses) => {
                            setFilter((filter) => ({
                                ...filter,
                                statuses: (statuses as CommandRunStatus[]).sort(),
                            }));
                        }}
                    >
                        <Stack gap={0}>
                            {commandRunStatuses.map((status) => (
                                <Checkbox
                                    mt="xs"
                                    key={status}
                                    value={status}
                                    label={COMMAND_RUN_STATUS_NAMES_MAP[status]}
                                />
                            ))}
                        </Stack>
                    </Checkbox.Group>
                </SoloAccordion>
            }
            tableHeader={[
                <Table.Th key="actions" />,
                <Table.Th key="createdAt">Date</Table.Th>,
                <Table.Th key="taskId">Task id</Table.Th>,
                <Table.Th key="name">Nom</Table.Th>,
                <Table.Th key="nameShort">Arguments</Table.Th>,
                <Table.Th key="status">Statut</Table.Th>,
                <Table.Th key="error">Erreur</Table.Th>,
                <Table.Th key="output">Message</Table.Th>,
            ]}
            tableBodyRenderFns={[
                (item: CommandRun) => (
                    <Tooltip label="Annuler la tâche">
                        <ActionIcon
                            disabled={!['PENDING', 'RUNNING'].includes(item.status)}
                            onClick={() => mutation.mutate(item.taskId)}
                            color="red"
                            variant="subtle"
                        >
                            <IconCancel />
                        </ActionIcon>
                    </Tooltip>
                ),
                (item: CommandRun) => <DateInfo date={item.createdAt} />,
                (item: CommandRun) => item.taskId,
                (item: CommandRun) => item.commandName,
                (item: CommandRun) => <ArgumentsDisplay arguments={item.arguments} />,
                (item: CommandRun) => <StatusBadge status={item.status} />,
                (item: CommandRun) => item.error,
                (item: CommandRun) => item.output,
            ]}
        />
    );
};

export default Component;
