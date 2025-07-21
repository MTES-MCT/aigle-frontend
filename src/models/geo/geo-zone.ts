import { Timestamped, Uuided } from '@/models/data';
import { Geometry } from 'geojson';

export const geoZoneTypes = ['COMMUNE', 'EPCI', 'DEPARTMENT', 'REGION', 'CUSTOM', 'SUB_CUSTOM'] as const;
export type GeoZoneType = (typeof geoZoneTypes)[number];

export interface GeoZone extends Uuided, Timestamped {
    name: string;
    geoZoneType: GeoZoneType;
    code?: string;
}

export interface GeoZoneDetail extends GeoZone {
    geometry: Geometry;
}
