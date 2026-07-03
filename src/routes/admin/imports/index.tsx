import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import borderedClasses from '@/components/DataTable/borderedContainer.module.scss';
import SoloAccordion from '@/components/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import {
    DataDeploymentItemRunResult,
    DataDeploymentRun,
    DataDeploymentRunResult,
    DataDeploymentStatus,
} from '@/models/data-deployment';
import api, { ApiError } from '@/utils/api';
import {
    ActionIcon,
    Anchor,
    Badge,
    Button,
    Group,
    Input,
    List,
    Modal,
    Stack,
    Table,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconRocket, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import isEqual from 'lodash/isEqual';

interface DataFilter {
    q: string;
    batchCreatedAtMin: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    batchCreatedAtMin: '',
};

const DEPLOYMENT_STATUS: Record<DataDeploymentStatus, { label: string; color: string }> = {
    NOT_DEPLOYED: { label: 'Non déployé', color: 'red' },
    DEPLOYMENT_RUNNING: { label: 'Déploiement en cours', color: 'orange' },
    DEPLOYED: { label: 'Déployé', color: 'green' },
};

const DeployStatusBadge: React.FC<{ status: DataDeploymentStatus }> = ({ status }) => (
    <Badge color={DEPLOYMENT_STATUS[status].color}>{DEPLOYMENT_STATUS[status].label}</Badge>
);

const DeployButton: React.FC<{ run: DataDeploymentRun }> = ({ run }) => {
    const queryClient = useQueryClient();
    const [confirmOpened, { open, close }] = useDisclosure(false);

    const mutation = useMutation<DataDeploymentRunResult, ApiError<{ detail?: string }>, void>({
        mutationFn: () => api<DataDeploymentRunResult>(dataDeploymentEndpoints.run(run.uuid), { method: 'POST' }),
        onSuccess: (result) => {
            close();
            const skipped = result.skippedBatches.length ? ` ${result.skippedBatches.length} batch(s) ignoré(s).` : '';
            notifications.show({
                title: 'Déploiement lancé',
                message:
                    `${result.tileSetsCreated.length} fond(s) de carte créé(s), ` +
                    `${result.queuedCommands.length} commande(s) en file d'attente.${skipped}`,
                color: 'green',
            });
            // imports run async on the queue, so statuses won't flip yet; refetch
            // anyway so a DEPLOYMENT_RUNNING already in flight is reflected
            queryClient.invalidateQueries({ queryKey: [dataDeploymentEndpoints.list] });
        },
        onError: (error) => {
            notifications.show({
                title: 'Erreur lors du déploiement',
                message: error.body?.detail ?? error.message,
                color: 'red',
            });
        },
    });

    const deploying = mutation.status === 'pending';
    // Don't let a deployment be stacked. Batch statuses only flip to DEPLOYMENT_RUNNING
    // once the queued import_detections actually runs (much later, behind the FIFO queue),
    // so also stay disabled once we've launched one this session (mutation.isSuccess).
    const deployDisabled =
        mutation.isSuccess || run.batches.some((batch) => batch.deployStatus === 'DEPLOYMENT_RUNNING');

    return (
        <>
            <Group justify="flex-end">
                <Button
                    leftSection={<IconRocket size={16} />}
                    onClick={open}
                    disabled={deployDisabled}
                    title={deployDisabled ? 'Un déploiement est déjà en cours ou vient d’être lancé' : undefined}
                >
                    Déployer les données
                </Button>
            </Group>

            <Modal opened={confirmOpened} onClose={close} title="Déployer les données" centered>
                <Stack>
                    <Text size="sm">Cette action va, pour {run.geozoneName ?? 'cette collectivité'} :</Text>
                    <List size="sm">
                        <List.Item>créer un fond de carte par batch et le groupe « Cabanisation »</List.Item>
                        <List.Item>
                            mettre en file les imports (zones à enjeux, tuiles, parcelles, détections, Sitadel)
                        </List.Item>
                    </List>
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={close} disabled={deploying}>
                            Annuler
                        </Button>
                        <Button onClick={() => mutation.mutate()} loading={deploying}>
                            Confirmer le déploiement
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};

// Deploy a single item (one batch / one zae layer) onto an already-deployed geozone.
const ItemDeployButton: React.FC<{
    endpoint: string;
    label: string; // e.g. "le batch « x »" — completes "Cette action va, pour {label} :"
    steps: string[];
    deployable: boolean; // only an undeployed item can be deployed
}> = ({ endpoint, label, steps, deployable }) => {
    const queryClient = useQueryClient();
    const [confirmOpened, { open, close }] = useDisclosure(false);

    const mutation = useMutation<DataDeploymentItemRunResult, ApiError<{ detail?: string }>, void>({
        mutationFn: () => api<DataDeploymentItemRunResult>(endpoint, { method: 'POST' }),
        onSuccess: (result) => {
            close();
            notifications.show({
                title: 'Déploiement lancé',
                message: `${result.queuedCommands.length} commande(s) en file d'attente.`,
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: [dataDeploymentEndpoints.list] });
        },
        onError: (error) => {
            notifications.show({
                title: 'Erreur lors du déploiement',
                message: error.body?.detail ?? error.message,
                color: 'red',
            });
        },
    });

    const deploying = mutation.status === 'pending';
    // once launched this session, keep it disabled (status flips later, behind the queue)
    const disabled = mutation.isSuccess || !deployable;

    return (
        <>
            <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconRocket size={14} />}
                onClick={open}
                disabled={disabled}
            >
                Déployer
            </Button>

            <Modal opened={confirmOpened} onClose={close} title="Déployer" centered>
                <Stack>
                    <Text size="sm">Cette action va, pour {label} :</Text>
                    <List size="sm">
                        {steps.map((step) => (
                            <List.Item key={step}>{step}</List.Item>
                        ))}
                    </List>
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={close} disabled={deploying}>
                            Annuler
                        </Button>
                        <Button onClick={() => mutation.mutate()} loading={deploying}>
                            Confirmer
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};

const ExpandedContent: React.FC<{ run: DataDeploymentRun }> = ({ run }) => (
    <Stack gap="lg" py="md">
        <DeployButton run={run} />

        <div>
            <Title order={5} mb="xs">
                Batches
            </Title>
            {run.batches.length === 0 ? (
                <Text c="dimmed" size="sm">
                    Aucun batch
                </Text>
            ) : (
                <div className={borderedClasses.container}>
                    <Table layout="fixed">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date création</Table.Th>
                                <Table.Th>Batch</Table.Th>
                                <Table.Th>Fond de carte</Table.Th>
                                <Table.Th>Statut déploiement</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {run.batches.map((batch, index) => (
                                <Table.Tr key={index}>
                                    <Table.Td>{batch.createdAt ? <DateInfo date={batch.createdAt} /> : '—'}</Table.Td>
                                    <Table.Td>{batch.name ?? '—'}</Table.Td>
                                    <Table.Td>
                                        {batch.tilesUrl ? (
                                            <Anchor
                                                href={batch.tilesUrl}
                                                target="_blank"
                                                size="sm"
                                                style={{ wordBreak: 'break-all' }}
                                            >
                                                {batch.tilesUrl}
                                            </Anchor>
                                        ) : (
                                            '—'
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <DeployStatusBadge status={batch.deployStatus} />
                                    </Table.Td>
                                    <Table.Td>
                                        <Group justify="flex-end">
                                            <ItemDeployButton
                                                endpoint={dataDeploymentEndpoints.runBatch(run.uuid, batch.id)}
                                                label={`le batch « ${batch.name ?? '—'} »`}
                                                steps={[
                                                    'créer le fond de carte',
                                                    'mettre en file les imports (détections, Sitadel)',
                                                ]}
                                                deployable={batch.deployStatus === 'NOT_DEPLOYED'}
                                            />
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            )}
        </div>

        <div>
            <Title order={5} mb="xs">
                Zones à enjeux
            </Title>
            {run.zaeLayers.length === 0 ? (
                <Text c="dimmed" size="sm">
                    Aucune zone à enjeux
                </Text>
            ) : (
                <div className={borderedClasses.container}>
                    <Table layout="fixed">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date création</Table.Th>
                                <Table.Th>Zone à enjeux</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Année</Table.Th>
                                <Table.Th>Statut déploiement</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {run.zaeLayers.map((zaeLayer, index) => (
                                <Table.Tr key={index}>
                                    <Table.Td>
                                        {zaeLayer.createdAt ? <DateInfo date={zaeLayer.createdAt} /> : '—'}
                                    </Table.Td>
                                    <Table.Td>{zaeLayer.name ?? '—'}</Table.Td>
                                    <Table.Td>{zaeLayer.typeName ?? zaeLayer.type ?? '—'}</Table.Td>
                                    <Table.Td>{zaeLayer.year ?? '—'}</Table.Td>
                                    <Table.Td>
                                        <DeployStatusBadge status={zaeLayer.deployStatus} />
                                    </Table.Td>
                                    <Table.Td>
                                        <Group justify="flex-end">
                                            <ItemDeployButton
                                                endpoint={dataDeploymentEndpoints.runZae(run.uuid, zaeLayer.id)}
                                                label={`la zone à enjeux « ${zaeLayer.name ?? '—'} »`}
                                                steps={['importer la zone à enjeux comme zone personnalisée']}
                                                deployable={zaeLayer.deployStatus === 'NOT_DEPLOYED'}
                                            />
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            )}
        </div>
    </Stack>
);

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    // guard like onChange does — a hand-edited URL (?batchCreatedAtMin=foo) parses to an
    // Invalid Date (truthy), which would feed a broken value into DateInput
    const parsedMin = filter.batchCreatedAtMin ? parse(filter.batchCreatedAtMin, 'yyyy-MM-dd', new Date()) : null;
    const batchCreatedAtMinDate = parsedMin && isValid(parsedMin) ? parsedMin : null;

    return (
        <LayoutAdminBase title="Imports">
            <DataTable<DataDeploymentRun, DataFilter>
                endpoint={dataDeploymentEndpoints.list}
                filter={filter}
                striped={false}
                highlightOnHover={false}
                layout="auto"
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher un batch"
                            leftSection={<IconSearch size={16} />}
                            value={filter.q}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setFilter((filter) => ({ ...filter, q: value }));
                            }}
                        />
                        <DateInput
                            label="Date de création (minimum)"
                            placeholder="Sélectionner une date"
                            clearable
                            valueFormat="DD/MM/YYYY"
                            dateParser={(value: string) => parse(value, 'dd/MM/yyyy', new Date())}
                            value={batchCreatedAtMinDate}
                            onChange={(date) => {
                                setFilter((filter) => ({
                                    ...filter,
                                    // a free-typed invalid date parses to an Invalid Date (truthy) — guard it
                                    batchCreatedAtMin: date && isValid(date) ? format(date, 'yyyy-MM-dd') : '',
                                }));
                            }}
                        />
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="createdAt">Date création</Table.Th>,
                    <Table.Th key="run">Run</Table.Th>,
                    <Table.Th key="actions" />,
                ]}
                tableBodyRenderFns={[
                    // createdAt is MAX(run.created_at) and can be null — guard like the nested rows do
                    (item: DataDeploymentRun) => (item.createdAt ? <DateInfo date={item.createdAt} /> : '—'),
                    (item: DataDeploymentRun) => item.geozoneName ?? '—',
                    () => (
                        <Tooltip label="Afficher les batches et zones à enjeux">
                            <ActionIcon variant="subtle">
                                <IconChevronDown size={16} />
                            </ActionIcon>
                        </Tooltip>
                    ),
                ]}
                getExpandedContent={(item: DataDeploymentRun) => <ExpandedContent run={item} />}
            />
        </LayoutAdminBase>
    );
};

export default Component;
