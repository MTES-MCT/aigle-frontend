import React from 'react';

import borderedClasses from '@/components/DataTable/borderedContainer.module.scss';
import DateInfo from '@/components/ui/DateInfo';
import { DataDeploymentBatch, DataDeploymentZaeLayer } from '@/models/data-deployment';
import { Anchor, Group, Table, Text, Title } from '@mantine/core';
import { DeployStatusBadge, ID_COLUMN_WIDTH, ItemDeployButton } from './shared';

const Section: React.FC<{ title: string; empty: string; isEmpty: boolean; children: React.ReactNode }> = ({
    title,
    empty,
    isEmpty,
    children,
}) => (
    <div>
        {title ? (
            <Title order={5} mb="xs">
                {title}
            </Title>
        ) : null}
        {isEmpty ? (
            <Text c="dimmed" size="sm">
                {empty}
            </Text>
        ) : (
            <div className={borderedClasses.container}>{children}</div>
        )}
    </div>
);

export const BatchesTable: React.FC<{
    batches: DataDeploymentBatch[];
    // null when there is no collectivity to deploy onto (then only the picker is offered)
    batchEndpoint: (batchId: number) => string | null;
    // offers deploying onto another collectivity picked in the modal
    pickGeozoneEndpoint?: (batchId: number) => string;
    geozoneName?: string | null;
}> = ({ batches, batchEndpoint, pickGeozoneEndpoint, geozoneName }) => (
    <Section title="Batches" empty="Aucun batch" isEmpty={!batches.length}>
        <Table layout="fixed">
            <Table.Thead>
                <Table.Tr>
                    <Table.Th w={ID_COLUMN_WIDTH}>Id</Table.Th>
                    <Table.Th w={ID_COLUMN_WIDTH}>Id run</Table.Th>
                    <Table.Th>Date création</Table.Th>
                    <Table.Th>Batch</Table.Th>
                    <Table.Th>Fond de carte</Table.Th>
                    <Table.Th>Statut déploiement</Table.Th>
                    <Table.Th />
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {/* keyed by id, not index: the deploy button holds per-row state (override
                    choice, "already launched") that a refetch reordering the rows would
                    otherwise transplant */}
                {batches.map((batch) => (
                    <Table.Tr key={batch.id}>
                        <Table.Td>{batch.id}</Table.Td>
                        <Table.Td>{batch.runId ?? '—'}</Table.Td>
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
                                    endpoint={batchEndpoint(batch.id)}
                                    pickGeozoneEndpoint={pickGeozoneEndpoint?.(batch.id)}
                                    geozoneName={geozoneName}
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
    </Section>
);

export const ZaeLayersTable: React.FC<{
    zaeLayers: DataDeploymentZaeLayer[];
    // null when the department isn't in the app: nothing to deploy onto
    zaeEndpoint: (zaeId: number) => string | null;
    title?: string;
}> = ({ zaeLayers, zaeEndpoint, title = 'Zones à enjeux' }) => (
    <Section title={title} empty="Aucune zone à enjeux" isEmpty={!zaeLayers.length}>
        <Table layout="fixed">
            <Table.Thead>
                <Table.Tr>
                    <Table.Th w={ID_COLUMN_WIDTH}>Id</Table.Th>
                    <Table.Th>Date création</Table.Th>
                    <Table.Th>Zone à enjeux</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Année</Table.Th>
                    <Table.Th>Statut déploiement</Table.Th>
                    <Table.Th />
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {zaeLayers.map((zaeLayer) => (
                    <Table.Tr key={zaeLayer.id}>
                        <Table.Td>{zaeLayer.id}</Table.Td>
                        <Table.Td>{zaeLayer.createdAt ? <DateInfo date={zaeLayer.createdAt} /> : '—'}</Table.Td>
                        <Table.Td>{zaeLayer.name ?? '—'}</Table.Td>
                        <Table.Td>{zaeLayer.typeName ?? zaeLayer.type ?? '—'}</Table.Td>
                        <Table.Td>{zaeLayer.year ?? '—'}</Table.Td>
                        <Table.Td>
                            <DeployStatusBadge status={zaeLayer.deployStatus} />
                        </Table.Td>
                        <Table.Td>
                            <Group justify="flex-end">
                                <ItemDeployButton
                                    endpoint={zaeEndpoint(zaeLayer.id)}
                                    kind="zae"
                                    name={zaeLayer.name}
                                    // zae layers are always deployable — an already-deployed
                                    // one is redeployed by overriding the zone it produced.
                                    // (The API never reports DEPLOYMENT_RUNNING for them: the
                                    // import is queued, not tracked.)
                                    deployable
                                    alreadyDeployed={zaeLayer.deployStatus === 'DEPLOYED'}
                                />
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    </Section>
);
