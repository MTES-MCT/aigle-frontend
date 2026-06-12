import React from 'react';

import { runCommandEndpoints } from '@/api/endpoints';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { CommandRun, CommandRunStatus, commandRunStatuses, CommandWithParameters } from '@/models/command';
import RunCommandModal from '@/routes/admin/run-command/RunCommandExecute/RunCommandModal';
import api, { ApiError } from '@/utils/api';
import { colors } from '@/utils/colors';
import { ActionIcon, Badge, Checkbox, Code, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCancel, IconReload } from '@tabler/icons-react';
import { useMutation, UseMutationResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { isEqual } from 'lodash';
import classes from './index.module.scss';

interface ArgumentsDisplayProps {
    arguments: CommandRun['arguments'];
}

const ArgumentsDisplay: React.FC<ArgumentsDisplayProps> = ({ arguments: args }) => {
    const hasKwargs = Object.keys(args.kwargs).length > 0;
    const hasArgs = (args.args || []).length > 0;

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
                        {(args.args || []).map((arg, index) => (
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

const ACTIVE_STATUSES: CommandRunStatus[] = ['PENDING', 'RUNNING'];
const INITIAL_REFETCH_INTERVAL_MS = 5000;

const cancelTask = (taskId: string) => api<string>(runCommandEndpoints.cancel(taskId), { method: 'POST' });

interface DataFilter {
    statuses: CommandRunStatus[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    statuses: [...commandRunStatuses].sort(),
};

interface CommandRunDetailProps {
    item: CommandRun;
}

const CommandRunDetail: React.FC<CommandRunDetailProps> = ({ item }) => {
    const hasOutput = !!item.output && item.output.trim().length > 0;
    const hasError = !!item.error && item.error.trim().length > 0;

    return (
        <Stack gap="md" className={classes['detail-container']}>
            {hasError ? (
                <div>
                    <Text size="sm" fw={600} c="red" mb={4}>
                        Erreur
                    </Text>
                    <Code block className={classes['detail-log']} color="var(--mantine-color-red-light)">
                        {item.error}
                    </Code>
                </div>
            ) : null}
            <div>
                <Text size="sm" fw={600} mb={4}>
                    Sortie
                </Text>
                {hasOutput ? (
                    <Code block className={classes['detail-log']}>
                        {item.output}
                    </Code>
                ) : (
                    <Text size="sm" c="dimmed">
                        {ACTIVE_STATUSES.includes(item.status)
                            ? 'La tâche est en cours d’exécution, les logs apparaîtront à la fin.'
                            : 'Aucune sortie.'}
                    </Text>
                )}
            </div>
        </Stack>
    );
};

const Component: React.FC = () => {
    const queryClient = useQueryClient();
    const mutation: UseMutationResult<string, ApiError, string> = useMutation({
        mutationFn: (taskId: string) => cancelTask(taskId),
        onSuccess: () => {
            notifications.show({
                title: 'La tâche a été annulée',
                message: 'La tâche a été annulée avec succès.',
            });
            queryClient.invalidateQueries({ queryKey: [runCommandEndpoints.tasks] });
        },
        onError: (error) => {
            notifications.show({
                title: "Erreur lors de l'annulation de la tâche",
                message: String(error.body) || "Une erreur est survenue lors de l'annulation de la tâche.",
            });
        },
    });
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    // Available commands (with their parameter definitions) needed to re-open the launch
    // modal for a retry. Shares the TanStack Query cache with the "Exécuter" tab.
    const { data: commands } = useQuery<CommandWithParameters[]>({
        queryKey: [runCommandEndpoints.list],
        queryFn: () => api<CommandWithParameters[]>(runCommandEndpoints.list),
    });
    const [retryModal, setRetryModal] = React.useState<{
        command: CommandWithParameters;
        initialValues: CommandRun['arguments']['kwargs'];
    }>();

    const handleRetry = (item: CommandRun) => {
        const command = (commands || []).find((command) => command.name === item.command_name);

        if (!command) {
            notifications.show({
                title: 'Commande introuvable',
                message: "Cette commande n'est plus disponible et ne peut pas être relancée.",
            });
            return;
        }

        // The API stores arguments keyed by the raw CLI flags ("--table-name"), which match the
        // form's parameter names, so they can pre-fill the modal directly — no re-mapping needed.
        setRetryModal({ command, initialValues: item.arguments.kwargs });
    };

    return (
        <>
            <DataTable<CommandRun, DataFilter>
                endpoint={runCommandEndpoints.tasks}
                filter={filter}
                refetchInterval={INITIAL_REFETCH_INTERVAL_MS}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Checkbox.Group
                            label="Statuts"
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
                    <Table.Th key="name">Commande</Table.Th>,
                    <Table.Th key="arguments">Arguments</Table.Th>,
                    <Table.Th key="status">Statut</Table.Th>,
                    <Table.Th key="taskId">Task id</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: CommandRun) => (
                        <Group gap="xs" wrap="nowrap">
                            <Tooltip label="Annuler la tâche">
                                <ActionIcon
                                    disabled={!ACTIVE_STATUSES.includes(item.status)}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        mutation.mutate(item.task_id);
                                    }}
                                    color="red"
                                    variant="subtle"
                                >
                                    <IconCancel />
                                </ActionIcon>
                            </Tooltip>
                            {item.status === 'ERROR' ? (
                                <Tooltip label="Relancer la commande">
                                    <ActionIcon
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleRetry(item);
                                        }}
                                        color="blue"
                                        variant="subtle"
                                    >
                                        <IconReload />
                                    </ActionIcon>
                                </Tooltip>
                            ) : null}
                        </Group>
                    ),
                    (item: CommandRun) => <DateInfo date={item.created_at} />,
                    (item: CommandRun) => item.command_name,
                    (item: CommandRun) => <ArgumentsDisplay arguments={item.arguments} />,
                    (item: CommandRun) => <StatusBadge status={item.status} />,
                    (item: CommandRun) => (
                        <Text size="xs" c="dimmed" className={classes['task-id']}>
                            {item.task_id}
                        </Text>
                    ),
                ]}
                getExpandedContent={(item: CommandRun) => <CommandRunDetail item={item} />}
            />

            <RunCommandModal
                isShowed={!!retryModal}
                hide={() => setRetryModal(undefined)}
                command={retryModal?.command}
                initialParamsValues={retryModal?.initialValues}
            />
        </>
    );
};

export default Component;
