import React, { useState } from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import { DataDeploymentItemRunResult, DataDeploymentStatus } from '@/models/data-deployment';
import api, { ApiError } from '@/utils/api';
import { Alert, Badge, Button, Checkbox, Group, List, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRocket } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DEPLOYMENT_STATUS: Record<DataDeploymentStatus, { label: string; color: string }> = {
    NOT_DEPLOYED: { label: 'Non déployé', color: 'red' },
    DEPLOYMENT_RUNNING: { label: 'Déploiement en cours', color: 'orange' },
    DEPLOYED: { label: 'Déployé', color: 'green' },
};

export const DeployStatusBadge: React.FC<{ status: DataDeploymentStatus }> = ({ status }) => (
    <Badge color={DEPLOYMENT_STATUS[status].color}>{DEPLOYMENT_STATUS[status].label}</Badge>
);

// label completes "Cette action va, pour {label} :"
const ITEM_KIND = {
    batch: {
        label: (name: string) => `le batch « ${name} »`,
        steps: ['créer le fond de carte', 'mettre en file les imports (tuiles, détections, Sitadel)'],
        // batches don't touch custom zones, so no override to offer
        overrideLabel: null,
    },
    zae: {
        label: (name: string) => `la zone à enjeux « ${name} »`,
        steps: ['importer la zone à enjeux comme zone personnalisée'],
        overrideLabel: 'Écraser la zone personnalisée existante',
    },
};

export const OVERRIDE_DESCRIPTION =
    'La zone personnalisée déjà déployée pour ce département et cette catégorie est mise à jour ' +
    '(géométrie, nom) au lieu de faire échouer l’import. Elle conserve ses groupes utilisateurs, ' +
    'et ses détections associées sont recalculées.';

// Deploy a single item (one batch / one zae layer) onto an already-deployed geozone.
export const ItemDeployButton: React.FC<{
    endpoint: string | null; // null when the item has no geozone to deploy onto
    kind: keyof typeof ITEM_KIND;
    name: string | null;
    deployable: boolean; // an item whose deployment is already running can't be re-launched
    // an already-deployed item can only be redeployed by overriding what it produced;
    // without it the import skips the source row and does nothing
    alreadyDeployed?: boolean;
}> = ({ endpoint, kind, name, deployable, alreadyDeployed = false }) => {
    const queryClient = useQueryClient();
    const [confirmOpened, { open, close }] = useDisclosure(false);
    const overrideLabel = ITEM_KIND[kind].overrideLabel;
    const [override, setOverride] = useState(alreadyDeployed);

    // reset from the current row state on every open, so a cancelled modal doesn't
    // carry a stale choice into the next one
    const openModal = () => {
        setOverride(alreadyDeployed);
        open();
    };

    const mutation = useMutation<DataDeploymentItemRunResult, ApiError<{ detail?: string }>, void>({
        mutationFn: () =>
            endpoint
                ? api<DataDeploymentItemRunResult>(endpoint, {
                      method: 'POST',
                      body: overrideLabel ? { overrideCustomZones: override } : undefined,
                  })
                : Promise.reject(new Error('Aucune collectivité rattachée')),
        onSuccess: (result) => {
            close();
            notifications.show({
                title: 'Déploiement lancé',
                message: `${result.queuedCommands.length} commande(s) en file d'attente.`,
                color: 'green',
            });
            // the three listings all derive their statuses from the same data
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
    // once launched this session, keep it disabled (status flips later, behind the queue)
    const disabled = mutation.isSuccess || !deployable || !endpoint;
    // redeploying an already-deployed item without overriding is a guaranteed no-op
    const confirmDisabled = alreadyDeployed && !!overrideLabel && !override;

    return (
        <>
            <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconRocket size={14} />}
                onClick={openModal}
                disabled={disabled}
                title={!endpoint ? 'Aucune collectivité rattachée' : undefined}
            >
                {alreadyDeployed && overrideLabel ? 'Redéployer' : 'Déployer'}
            </Button>

            <Modal opened={confirmOpened} onClose={close} title="Déployer" centered>
                <Stack>
                    <Text size="sm">Cette action va, pour {ITEM_KIND[kind].label(name ?? '—')} :</Text>
                    <List size="sm">
                        {ITEM_KIND[kind].steps.map((step) => (
                            <List.Item key={step}>{step}</List.Item>
                        ))}
                    </List>

                    {overrideLabel ? (
                        <>
                            {alreadyDeployed ? (
                                <Alert color="orange" variant="light">
                                    Cet élément est déjà déployé : sans écrasement, l’import ne le redéploiera pas (la
                                    ligne source est ignorée, ou l’import échoue sur la zone existante).
                                </Alert>
                            ) : null}
                            <Checkbox
                                label={overrideLabel}
                                description={OVERRIDE_DESCRIPTION}
                                checked={override}
                                onChange={(event) => setOverride(event.currentTarget.checked)}
                            />
                        </>
                    ) : null}

                    <Group justify="flex-end">
                        <Button variant="outline" onClick={close} disabled={deploying}>
                            Annuler
                        </Button>
                        <Button
                            onClick={() => mutation.mutate()}
                            loading={deploying}
                            disabled={confirmDisabled}
                            title={confirmDisabled ? 'Activez l’écrasement pour redéployer cet élément' : undefined}
                        >
                            Confirmer
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};
