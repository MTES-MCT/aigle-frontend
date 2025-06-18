import { utilsEndpoints } from '@/api/endpoints';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import Loader from '@/components/ui/Loader';
import { ImportsInfos } from '@/models/info-imports';
import api from '@/utils/api';
import { Code, Table } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import classes from './index.module.scss';

const fetchImportInfos = async (): Promise<ImportsInfos> => {
    const res = await api.get<ImportsInfos>(utilsEndpoints.importsInfos);
    return res.data;
};

interface ImportsElementProps {
    items: string[];
}

const FieldPossibleValues: React.FC<ImportsElementProps> = ({ items }) => {
    return (
        <>
            <p>Valeurs possibles :</p>
            <Code block mb="md">
                {items.map((item) => (
                    <div key={item}>{item}</div>
                ))}
            </Code>
        </>
    );
};

const CSV_FIELDS: { name: string; required?: boolean; description: string; valueName?: string }[] = [
    { name: 'id', required: true, description: 'ID externe' },
    { name: 'batch_id', required: true, description: "ID du batch d'import, il est spécifié lors de l'import" },
    { name: 'score', required: true, description: 'Score de la détection' },
    { name: 'tile_x', description: 'Pour les détections sur les tuiles qui ne sont pas encore en bdd' },
    { name: 'tile_y', description: 'Pour les détections sur les tuiles qui ne sont pas encore en bdd' },
    { name: 'address', description: 'Adresse' },
    { name: 'object_type', required: true, description: "Type de l'objet", valueName: 'objectTypes' },
    { name: 'geometry', required: true, description: 'Geometry (polygon) de la détection' },
    {
        name: 'detection_source',
        description: 'Source de la détection, si non-spécifiée, la source sera ANALYSIS',
        valueName: 'detectionSources',
    },
    {
        name: 'detection_control_status',
        description: 'Le statut de contrôle, si non-spécifiée, la statut sera DETECTED',
        valueName: 'detectionControlStatuses',
    },
    {
        name: 'detection_validation_status',
        description: 'Le statut de validation, si non-spécifiée, la statut sera DETECTED_NOT_VERIFIED',
        valueName: 'detectionValidationStatuses',
    },
    {
        name: 'detection_prescription_status',
        description:
            'Le statut de prescription, si non-spécifiée, le statut sera calculé automatiquement en fonction des détections liées.',
        valueName: 'detectionPrescriptionStatuses',
    },
    { name: 'user_reviewed', description: 'true si un utilisateur a validé la détection' },
];

const Component: React.FC = () => {
    const { data, isLoading } = useQuery<ImportsInfos>({
        queryKey: ['imports-infos'],
        queryFn: () => fetchImportInfos(),
    });

    return (
        <LayoutAdminBase title="Informations pour lancer un import">
            {isLoading || !data ? (
                <Loader />
            ) : (
                <div className={classes.container}>
                    <p>
                        Pour lancer un import, vous devez fournir une table dans un schema autre que <Code>public</Code>{' '}
                        OU un fichier CSV avec les données à importer.
                    </p>
                    <p>Voici la liste des champs à renseigner :</p>

                    <Table mt="md" mb="md">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Champ</Table.Th>
                                <Table.Th>Description</Table.Th>
                            </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                            {CSV_FIELDS.map(({ name, required, description, valueName }) => (
                                <Table.Tr key={name}>
                                    <Table.Td>
                                        <Code>{name}</Code> {required ? ' (requis)' : null}
                                    </Table.Td>
                                    <Table.Td>
                                        <p>{description}</p>
                                        {valueName ? (
                                            <FieldPossibleValues items={data[valueName as keyof ImportsInfos]} />
                                        ) : null}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            )}
        </LayoutAdminBase>
    );
};

export default Component;
