import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import { QueryClient } from '@tanstack/react-query';

// every listing derives its statuses from the same data: a deploy from one tab refreshes them all
export const invalidateDeploymentLists = (queryClient: QueryClient) =>
    [
        dataDeploymentEndpoints.list,
        dataDeploymentEndpoints.batches,
        dataDeploymentEndpoints.zae,
        dataDeploymentEndpoints.plans,
    ].forEach((endpoint) => queryClient.invalidateQueries({ queryKey: [endpoint] }));

// what the API matches a collectivity on, listed in the search tooltips
export const GEOZONE_SEARCH_MATCHES = [
    'nom de la collectivité',
    'code INSEE / SIREN de la collectivité (début du code)',
    'nom ou code du département',
];
