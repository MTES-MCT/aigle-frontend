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
        { name: 'régions', label: 'Régions', description: 'Liste de noms de régions', example: 'Occitanie' },
        {
            name: 'départements',
            label: 'Départements',
            description: 'Liste de noms de départements',
            example: 'Hérault',
        },
        {
            name: 'communes',
            label: 'Communes',
            description: 'Liste de noms de communes',
            example: 'Montpellier',
        },
    ],
};
