import { GeoZone } from '@/models/geo/geo-zone';
import { Geometry } from 'geojson';

export const collectivityTypes = ['region', 'department', 'epci', 'commune'] as const;
export type CollectivityType = (typeof collectivityTypes)[number];

export interface GeoCollectivity extends GeoZone {
    code: string;
}

export interface GeoCollectivityDetail extends GeoCollectivity {
    geometry: Geometry;
}
