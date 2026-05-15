import { customZoneEndpoints } from '@/api/endpoints';
import { BulkConfig } from '@/components/admin/BulkImportExport';

export const customZoneBulkConfig: BulkConfig = {
    entityLabel: 'zones',
    fileBaseName: 'zones-a-enjeux-export',
    listEndpoint: customZoneEndpoints.list,
    exportEndpoint: customZoneEndpoints.export,
    previewEndpoint: customZoneEndpoints.bulkImportPreview,
    importEndpoint: customZoneEndpoints.bulkImport,
    columns: [
        {
            name: 'catégorie',
            label: 'Catégorie',
            description: 'Nom exact de la catégorie (optionnel si couleur renseignée)',
            example: 'Zones à fort enjeu environnemental',
        },
        {
            name: 'nom de la zone',
            label: 'Nom',
            description: 'Nom unique de la zone',
            example: 'Zones à fort enjeu environnemental [TOULOUSE]',
        },
        {
            name: 'nom court de la zone',
            label: 'Nom court',
            description: 'Nom court unique (optionnel)',
            example: 'UA',
        },
        {
            name: 'couleur',
            label: 'Couleur',
            description: 'Code couleur hex (requis si pas de catégorie)',
            example: '#FF5733',
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
