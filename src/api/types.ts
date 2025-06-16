import { CollectivityType } from '@/models/geo/_common';

export interface ApiEndpoint {
    list: string;
    create: string;
    detail: (id: string) => string;
}

export type DownloadOutputFormat = 'csv' | 'xlsx';

export interface GeoEndpoints {
    list: (collectivityType: CollectivityType) => string;
    create: (collectivityType: CollectivityType) => string;
    detail: (collectivityType: CollectivityType, uuid: string) => string;
}
