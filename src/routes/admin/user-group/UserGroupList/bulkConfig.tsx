import { userGroupEndpoints } from '@/api/endpoints';
import { BulkConfig } from '@/components/admin/BulkImportExport';

export const userGroupBulkConfig: BulkConfig = {
    entityLabel: 'groupes',
    fileBaseName: 'groupes-utilisateurs-export',
    listEndpoint: userGroupEndpoints.list,
    exportEndpoint: userGroupEndpoints.export,
    previewEndpoint: userGroupEndpoints.bulkImportPreview,
    importEndpoint: userGroupEndpoints.bulkImport,
    columns: [
        { name: 'nom du groupe', label: 'Nom', description: 'Nom unique du groupe', example: 'Cabanisation Hérault' },
        { name: 'type', label: 'Type', description: '"Collectivité" ou "DDTM"', example: 'Collectivité' },
        {
            name: 'thématiques',
            label: 'Thématiques',
            description: 'Liste de noms de thématiques (séparés par |)',
            example: 'Cabanisation',
        },
        {
            name: 'régions (code INSEE)',
            label: 'Régions',
            description: 'Liste de codes INSEE de régions',
            example: '76',
        },
        {
            name: 'départements (code INSEE)',
            label: 'Départements',
            description: 'Liste de codes INSEE de départements',
            example: '34',
        },
        {
            name: 'communes (code ISO)',
            label: 'Communes',
            description: 'Liste de codes ISO de communes',
            example: '34172',
        },
    ],
};
