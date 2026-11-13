import React, { useState } from 'react';

import { DataDeploymentBatch, DataDeploymentRunResult, DataDeploymentZaeLayer } from '@/models/data-deployment';
import api, { ApiError } from '@/utils/api';
import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRocket } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OVERRIDE_DESCRIPTION } from './shared';
import { invalidateDeploymentLists } from './utils';

interface ComponentProps {
    // null: nothing to deploy onto, the button stays disabled with `unavailableReason`
    endpoint: string | null;
    unavailableReason?: string;
    targetName: string | null;
    batches: DataDeploymentBatch[];
    zaeLayers: DataDeploymentZaeLayer[];
    label?: string;
}

// Deploy a collectivity's data (whole geozone or plan): pick the batches and zae layers in a
// modal, everything checked by default.
const Component: React.FC<ComponentProps> = ({
    endpoint,
    unavailableReason,
    targetName,
    batches,
    zaeLayers,
    label = 'Déployer les données',
}) => {
    const queryClient = useQueryClient();
    const [confirmOpened, { open, close }] = useDisclosure(false);

    // Checkbox.Group works in strings; ids are numbers
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [selectedZaeIds, setSelectedZaeIds] = useState<string[]>([]);
    const [overrideCustomZones, setOverrideCustomZones] = useState(false);

    // an already-deployed zae layer is skipped by the import unless it is overridden
    const someZaeAlreadyDeployed = zaeLayers.some((zae) => zae.deployStatus === 'DEPLOYED');

    const openModal = () => {
        setSelectedBatchIds(batches.map((batch) => String(batch.id)));
        setSelectedZaeIds(zaeLayers.map((zae) => String(zae.id)));
        setOverrideCustomZones(someZaeAlreadyDeployed);
        open();
    };

    const mutation = useMutation<DataDeploymentRunResult, ApiError<{ detail?: string }>, void>({
        mutationFn: () =>
            endpoint
                ? api<DataDeploymentRunResult>(endpoint, {
                      method: 'POST',
                      // only the checked batches / zae layers are deployed
                      body: {
                          batchIds: selectedBatchIds.map(Number),
                          zaeLayerIds: selectedZaeIds.map(Number),
                          overrideCustomZones,
                      },
                  })
                : Promise.reject(new Error(unavailableReason ?? 'Déploiement impossible')),
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
            invalidateDeploymentLists(queryClient);
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
    const running = mutation.isSuccess || batches.some((batch) => batch.deployStatus === 'DEPLOYMENT_RUNNING');
    const disabledReason = !endpoint
        ? unavailableReason
        : running
          ? 'Un déploiement est déjà en cours ou vient d’être lancé'
          : undefined;

    return (
        <>
            <Group justify="flex-end">
                <Button
                    leftSection={<IconRocket size={16} />}
                    onClick={openModal}
                    disabled={!!disabledReason}
                    title={disabledReason}
                >
                    {label}
                </Button>
            </Group>

            <Modal opened={confirmOpened} onClose={close} title={label} centered>
                <Stack>
                    <Text size="sm">
                        Sélectionnez les batches et zones à enjeux à déployer pour {targetName ?? 'cette collectivité'}{' '}
                        :
                    </Text>

                    {batches.length ? (
                        <Checkbox.Group label="Batches" value={selectedBatchIds} onChange={setSelectedBatchIds}>
                            <Stack gap="xs" mt="xs">
                                {batches.map((batch) => (
                                    <Checkbox
                                        key={batch.id}
                                        value={String(batch.id)}
                                        label={batch.name ?? `Batch ${batch.id}`}
                                    />
                                ))}
                            </Stack>
                        </Checkbox.Group>
                    ) : (
                        <Text size="sm" c="dimmed">
                            Aucun batch à déployer.
                        </Text>
                    )}

                    {zaeLayers.length ? (
                        <>
                            <Checkbox.Group label="Zones à enjeux" value={selectedZaeIds} onChange={setSelectedZaeIds}>
                                <Stack gap="xs" mt="xs">
                                    {zaeLayers.map((zae) => (
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

export default Component;
