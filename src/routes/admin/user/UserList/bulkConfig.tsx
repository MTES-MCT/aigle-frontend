import { usersEndpoints } from '@/api/endpoints';
import { BulkConfig } from '@/components/admin/BulkImportExport';
import { CopyButton, Stack, Table, Text } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';

export const userBulkConfig: BulkConfig = {
    entityLabel: 'utilisateurs',
    fileBaseName: 'utilisateurs-export',
    listEndpoint: usersEndpoints.list,
    exportEndpoint: usersEndpoints.export,
    previewEndpoint: usersEndpoints.bulkImportPreview,
    importEndpoint: usersEndpoints.bulkImport,
    columns: [
        {
            name: 'email',
            label: 'Email',
            description: "Email de l'utilisateur (unique)",
            example: 'jean@exemple.fr',
        },
        {
            name: 'role',
            label: 'Rôle',
            description: 'Rôle: SUPER_ADMIN, ADMIN, REGULAR ou DEACTIVATED',
            example: 'REGULAR',
        },
        {
            name: 'nom du groupe',
            label: 'Groupe',
            description: 'Nom exact du groupe (un seul groupe par utilisateur)',
            example: 'Cabanisation Hérault',
        },
        {
            name: 'droits du groupe',
            label: 'Droits',
            description: '"Ecriture" ou "Lecture"',
            example: 'Ecriture',
        },
    ],
    renderSuccessExtra: (response) => {
        if (!response.created || !response.created.length) {
            return null;
        }
        return (
            <Stack w="100%">
                <Text size="sm" fw={500}>
                    Mots de passe générés (à transmettre aux utilisateurs) :
                </Text>
                <Table withTableBorder withColumnBorders striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Mot de passe</Table.Th>
                            <Table.Th></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {response.created.map((c) => (
                            <Table.Tr key={c.email}>
                                <Table.Td>{c.email}</Table.Td>
                                <Table.Td>
                                    <code>{c.password}</code>
                                </Table.Td>
                                <Table.Td>
                                    <CopyButton value={c.password}>
                                        {({ copied, copy }) => (
                                            <IconCopy
                                                size={16}
                                                style={{ cursor: 'pointer', color: copied ? 'green' : undefined }}
                                                onClick={copy}
                                            />
                                        )}
                                    </CopyButton>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Stack>
        );
    },
};
