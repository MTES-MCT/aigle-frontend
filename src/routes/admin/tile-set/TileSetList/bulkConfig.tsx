import { tileSetEndpoints } from '@/api/endpoints';
import { BulkConfig } from '@/components/admin/BulkImportExport';

export const tileSetBulkConfig: BulkConfig = {
    entityLabel: 'fonds de carte',
    fileBaseName: 'fonds-de-carte-export',
    listEndpoint: tileSetEndpoints.list,
    exportEndpoint: tileSetEndpoints.export,
    previewEndpoint: tileSetEndpoints.bulkImportPreview,
    importEndpoint: tileSetEndpoints.bulkImport,
    columns: [
        {
            name: 'année',
            label: 'Année',
            description: 'Année au format YYYY',
            example: '2024',
        },
        {
            name: 'nom du fond de carte',
            label: 'Nom',
            description: 'Nom unique du fond de carte',
            example: 'Hérault 2024',
        },
        {
            name: 'url',
            label: 'URL',
            description: 'URL XYZ unique du tileset',
            example: 'https://tiles.aigle.beta.gouv.fr/aerial/nouvelle-aquitaine/2024_gironde/{z}/{x}/{y}.png',
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
