import { GeoZone } from '@/models/geo/geo-zone';

export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Timestamped {
    createdAt: string;
    updatedAt: string;
}

export interface Uuided {
    uuid: string;
}

export interface WithCollectivities {
    communes: GeoZone[];
    departments: GeoZone[];
    regions: GeoZone[];
}
