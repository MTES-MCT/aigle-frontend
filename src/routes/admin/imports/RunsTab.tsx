import React, { useState } from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import borderedClasses from '@/components/DataTable/borderedContainer.module.scss';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentRun, DataDeploymentRunResult } from '@/models/data-deployment';
import api, { ApiError } from '@/utils/api';
import {
    ActionIcon,
    Anchor,
    Button,
    Checkbox,
    Group,
    Input,
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
import { DeployStatusBadge, ItemDeployButton, OVERRIDE_DESCRIPTION } from './shared';

interface DataFilter {
    q: string;
    batchCreatedAtMin: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    batchCreatedAtMin: '',
};

const DeployButton: React.FC<{ run: DataDeploymentRun }> = ({ run }) => {
    const queryClient = useQueryClient();
    const [confirmOpened, { open, close }] = useDisclosure(false);

    // Checkbox.Group works in strings; ids are numbers. Default: everything checked.
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [selectedZaeIds, setSelectedZaeIds] = useState<string[]>([]);
    const [overrideCustomZones, setOverrideCustomZones] = useState(false);

    // an already-deployed zae layer is skipped by the import unless it is overridden
    const someZaeAlreadyDeployed = run.zaeLayers.some((zae) => zae.deployStatus === 'DEPLOYED');

    const openModal = () => {
        setSelectedBatchIds(run.batches.map((batch) => String(batch.id)));
        setSelectedZaeIds(run.zaeLayers.map((zae) => String(zae.id)));
        setOverrideCustomZones(someZaeAlreadyDeployed);
        open();
    };

    const mutation = useMutation<DataDeploymentRunResult, ApiError<{ detail?: string }>, void>({
        mutationFn: () =>
            api<DataDeploymentRunResult>(dataDeploymentEndpoints.run(run.uuid), {
                method: 'POST',
                // only the checked batches / zae layers are deployed
                body: {
                    batchIds: selectedBatchIds.map(Number),
                    zaeLayerIds: selectedZaeIds.map(Number),
                    overrideCustomZones,
                },
            }),
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
            // anyway so a DEPLOYMENT_RUNNING already in flight is reflected. The three
            // listings all derive their statuses from the same data.
            [dataDeploymentEndpoints.list, dataDeploymentEndpoints.batches, dataDeploymentEndpoints.zae].forEach(
                (endpoint) => queryClient.invalidateQueries({ queryKey: [endpoint] }),
            );
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
                    onClick={openModal}
                    disabled={deployDisabled}
                    title={deployDisabled ? 'Un déploiement est déjà en cours ou vient d’être lancé' : undefined}
                >
                    Déployer les données
                </Button>
            </Group>

            <Modal opened={confirmOpened} onClose={close} title="Déployer les données" centered>
                <Stack>
                    <Text size="sm">
                        Sélectionnez les batches et zones à enjeux à déployer pour{' '}
                        {run.geozoneName ?? 'cette collectivité'} :
                    </Text>

                    {run.batches.length ? (
                        <Checkbox.Group label="Batches" value={selectedBatchIds} onChange={setSelectedBatchIds}>
                            <Stack gap="xs" mt="xs">
                                {run.batches.map((batch) => (
                                    <Checkbox
                                        key={batch.id}
                                        value={String(batch.id)}
                                        label={batch.name ?? `Batch ${batch.id}`}
                                    />
                                ))}
                            </Stack>
                        </Checkbox.Group>
                    ) : null}

                    {run.zaeLayers.length ? (
                        <>
                            <Checkbox.Group label="Zones à enjeux" value={selectedZaeIds} onChange={setSelectedZaeIds}>
                                <Stack gap="xs" mt="xs">
                                    {run.zaeLayers.map((zae) => (
                                        <Checkbox
                                            key={zae.id}
                                            value={String(zae.id)}
                                            label={zae.name ?? `Zone à enjeux ${zae.id}`}
                                            // a deployed layer needs the override below to
                                            // be redeployed — say so before they confirm
                                            description={
                                                zae.deployStatus === 'DEPLOYED'
                                                    ? 'Déjà déployée : nécessite l’écrasement'
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </Stack>
                            </Checkbox.Group>

                            <Checkbox
                                label="Écraser les zones personnalisées existantes"
                                description={OVERRIDE_DESCRIPTION}
                                checked={overrideCustomZones}
                                onChange={(event) => setOverrideCustomZones(event.currentTarget.checked)}
                            />
                        </>
                    ) : null}

                    <Text size="xs" c="dimmed">
                        Crée un fond de carte par batch sélectionné et le groupe « Cabanisation », puis met en file les
                        imports (zones à enjeux sélectionnées, tuiles, parcelles, détections, Sitadel).
                    </Text>

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
                            {/* keyed by id, not index: the deploy button holds per-row
                                state (override choice, "already launched") that a
                                refetch reordering the rows would otherwise transplant */}
                            {run.batches.map((batch) => (
                                <Table.Tr key={batch.id}>
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
                                                kind="batch"
                                                name={batch.name}
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
                            {run.zaeLayers.map((zaeLayer) => (
                                <Table.Tr key={zaeLayer.id}>
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
                                                kind="zae"
                                                name={zaeLayer.name}
                                                // zae layers are always deployable — an
                                                // already-deployed one is redeployed by
                                                // overriding the zone it produced
                                                deployable
                                                alreadyDeployed={zaeLayer.deployStatus === 'DEPLOYED'}
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
    );
};

export default Component;
