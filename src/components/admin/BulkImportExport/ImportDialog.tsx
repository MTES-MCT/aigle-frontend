import { useState } from 'react';

import api, { ApiError } from '@/utils/api';
import { Alert, Button, Group, Loader, Modal, Stack, Stepper, Table, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconUpload, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';

import { BulkConfig, BulkImportPreviewResponse, BulkImportResponse } from './types';

interface Props {
    config: BulkConfig;
    opened: boolean;
    onClose: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'success';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ImportDialog = ({ config, opened, onClose }: Props) => {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewData, setPreviewData] = useState<BulkImportPreviewResponse | null>(null);
    const [importResponse, setImportResponse] = useState<BulkImportResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const reset = () => {
        setStep('upload');
        setFile(null);
        setUploading(false);
        setPreviewData(null);
        setImportResponse(null);
        setErrorMessage(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const submitFile = async (selected: File) => {
        setFile(selected);
        setUploading(true);
        setErrorMessage(null);
        try {
            const form = new FormData();
            form.append('file', selected);
            const data = await api<BulkImportPreviewResponse>(config.previewEndpoint, {
                method: 'POST',
                body: form,
            });
            setPreviewData(data);
            setStep('preview');
        } catch (err) {
            const apiErr = err as ApiError<{ errors?: string[] }>;
            const errs = apiErr?.body?.errors;
            if (errs && errs.length) {
                setPreviewData({ rowsCount: 0, preview: [], errors: errs });
                setStep('preview');
            } else {
                setErrorMessage(apiErr?.message || 'Erreur lors de la lecture du fichier');
            }
        } finally {
            setUploading(false);
        }
    };

    const runImport = async () => {
        if (!file) return;
        setStep('importing');
        setErrorMessage(null);
        try {
            const form = new FormData();
            form.append('file', file);
            const data = await api<BulkImportResponse>(config.importEndpoint, {
                method: 'POST',
                body: form,
            });
            setImportResponse(data);
            setStep('success');
            notifications.show({
                title: 'Import réussi',
                message: `${data.createdCount} ${config.entityLabel} créés`,
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: [config.listEndpoint] });
        } catch (err) {
            const apiErr = err as ApiError<{ errors?: string[] }>;
            const errs = apiErr?.body?.errors;
            setErrorMessage(errs?.join('\n') || apiErr?.message || "Erreur lors de l'import");
            setStep('preview');
        }
    };

    const stepIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : 2;
    const previewHasErrors = !!previewData && previewData.errors.length > 0;

    return (
        <Modal opened={opened} onClose={handleClose} size="xl" title={`Importer des ${config.entityLabel}`}>
            <Stepper active={stepIndex} allowNextStepsSelect={false}>
                <Stepper.Step label="Format & fichier">
                    <Stack mt="md">
                        <Text size="sm">
                            Format CSV attendu (séparateur <code>;</code>, listes séparées par <code>|</code>) :
                        </Text>
                        <Table withTableBorder withColumnBorders striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Colonne</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                    <Table.Th>Exemple</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {config.columns.map((col) => (
                                    <Table.Tr key={col.name}>
                                        <Table.Td>
                                            <strong>{col.name}</strong>
                                        </Table.Td>
                                        <Table.Td>{col.description}</Table.Td>
                                        <Table.Td>{col.example ?? ''}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        {errorMessage ? (
                            <Alert color="red" icon={<IconAlertCircle size={16} />}>
                                {errorMessage}
                            </Alert>
                        ) : null}

                        <Dropzone
                            onDrop={(files) => files[0] && submitFile(files[0])}
                            onReject={() => setErrorMessage('Fichier invalide (CSV requis, taille max 5 Mo)')}
                            accept={[MIME_TYPES.csv, 'text/csv', 'application/vnd.ms-excel']}
                            maxSize={MAX_FILE_SIZE}
                            multiple={false}
                            loading={uploading}
                        >
                            <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                                <Dropzone.Accept>
                                    <IconUpload size={48} />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX size={48} />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconUpload size={48} />
                                </Dropzone.Idle>
                                <div>
                                    <Text size="lg" inline>
                                        Déposer un fichier CSV ici, ou cliquer pour le sélectionner
                                    </Text>
                                    <Text size="sm" c="dimmed" inline mt={7}>
                                        Taille maximale 5 Mo
                                    </Text>
                                </div>
                            </Group>
                        </Dropzone>
                    </Stack>
                </Stepper.Step>

                <Stepper.Step label="Aperçu">
                    <Stack mt="md">
                        {previewHasErrors ? (
                            <>
                                <Alert color="red" icon={<IconAlertCircle size={16} />} title="Erreurs détectées">
                                    <Stack gap={4}>
                                        {previewData!.errors.map((err, i) => (
                                            <Text key={i} size="sm">
                                                {err}
                                            </Text>
                                        ))}
                                    </Stack>
                                </Alert>
                                <Group justify="flex-end">
                                    <Button variant="default" onClick={reset}>
                                        Réimporter un fichier
                                    </Button>
                                </Group>
                            </>
                        ) : previewData ? (
                            <>
                                <Text>
                                    <strong>{previewData.rowsCount}</strong> {config.entityLabel} seront créés
                                </Text>
                                <Table withTableBorder withColumnBorders striped>
                                    <Table.Thead>
                                        <Table.Tr>
                                            {config.columns.map((col) => (
                                                <Table.Th key={col.name}>{col.label}</Table.Th>
                                            ))}
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {previewData.preview.map((row, i) => (
                                            <Table.Tr key={i}>
                                                {config.columns.map((col) => (
                                                    <Table.Td key={col.name}>{row[col.name] ?? ''}</Table.Td>
                                                ))}
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                {errorMessage ? (
                                    <Alert color="red" icon={<IconAlertCircle size={16} />}>
                                        {errorMessage}
                                    </Alert>
                                ) : null}
                                <Group justify="flex-end">
                                    <Button variant="default" onClick={reset}>
                                        Annuler
                                    </Button>
                                    <Button onClick={runImport}>Importer</Button>
                                </Group>
                            </>
                        ) : null}
                    </Stack>
                </Stepper.Step>

                <Stepper.Step label="Succès">
                    <Stack mt="md" align="center">
                        {step === 'importing' ? (
                            <>
                                <Loader />
                                <Text>Import en cours…</Text>
                            </>
                        ) : importResponse ? (
                            <>
                                <IconCheck size={48} color="green" />
                                <Text size="lg">
                                    {importResponse.createdCount} {config.entityLabel} créés avec succès
                                </Text>
                                {config.renderSuccessExtra?.(importResponse)}
                                <Button onClick={handleClose}>Fermer</Button>
                            </>
                        ) : null}
                    </Stack>
                </Stepper.Step>
            </Stepper>
        </Modal>
    );
};

export default ImportDialog;
