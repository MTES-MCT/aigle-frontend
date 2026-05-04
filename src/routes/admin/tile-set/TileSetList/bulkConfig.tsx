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
        { name: 'régions', label: 'Régions', description: 'Liste de noms de régions', example: 'Occitanie' },
        {
            name: 'départements',
            label: 'Départements',
            description: 'Liste de noms de départements',
            example: 'Hérault',
        },
        { name: 'communes', label: 'Communes', description: 'Liste de noms de communes', example: 'Montpellier' },
    ],
};
