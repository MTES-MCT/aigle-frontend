import { GeoZone, GeoZoneDetail } from '@/models/geo/geo-zone';
import { Feature, Polygon } from 'geojson';

export const geoCustomZoneStatuses = ['ACTIVE', 'INACTIVE'] as const;
export type GeoCustomZoneStatus = (typeof geoCustomZoneStatuses)[number];

export const geoCustomZoneTypes = ['COMMON', 'COLLECTIVITY_MANAGED'] as const;
export type GeoCustomZoneType = (typeof geoCustomZoneTypes)[number];

export interface GeoCustomZone extends GeoZone {
    color: string;
    geoCustomZoneStatus: GeoCustomZoneStatus;
    geoCustomZoneType: GeoCustomZoneType;
}

export interface GeoCustomZoneDetail extends GeoCustomZone, GeoZoneDetail {}

export interface GeoCustomZoneProperties {
    uuid: string;
    color: string;
    name: string;
    geoCustomZoneStatus: GeoCustomZoneStatus;
}

export interface GeoCustomZoneGeojsonData extends Feature<Polygon, GeoCustomZoneProperties> {}
