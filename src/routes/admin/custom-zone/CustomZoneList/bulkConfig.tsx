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
            description: 'Nom exact de la catégorie de zone (obligatoire)',
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
            description: 'fort enjeu environnemental toulouse',
            example: 'UA',
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
