import { WithCollectivities } from '@/models/data';
import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';
import { GeoSubCustomZoneMinimal } from '@/models/geo/geo-sub-custom-zone';
import { GeoZone, GeoZoneDetail } from '@/models/geo/geo-zone';
import { Feature, MultiPolygon, Polygon } from 'geojson';

export const geoCustomZoneStatuses = ['ACTIVE', 'INACTIVE'] as const;
export type GeoCustomZoneStatus = (typeof geoCustomZoneStatuses)[number];

export const geoCustomZoneTypes = ['COMMON', 'COLLECTIVITY_MANAGED'] as const;
export type GeoCustomZoneType = (typeof geoCustomZoneTypes)[number];

export interface GeoCustomZone extends GeoZone {
    color: string;
    geoCustomZoneStatus: GeoCustomZoneStatus;
    geoCustomZoneType: GeoCustomZoneType;
    geoCustomZoneCategory: GeoCustomZoneCategory | null;
}
export interface GeoCustomZoneWithSubZones extends GeoCustomZone {
    subCustomZones: GeoSubCustomZoneMinimal[];
}
export interface GeoCustomZoneWithCollectivities extends GeoCustomZone, WithCollectivities {}

export interface GeoCustomZoneDetail extends GeoCustomZone, GeoZoneDetail {}

export interface GeoCustomZoneProperties {
    uuid: string;
    color: string;
    name: string;
    geoCustomZoneStatus: GeoCustomZoneStatus;
}

export interface GeoCustomZoneGeojsonData extends Feature<Polygon, GeoCustomZoneProperties> {}

export interface GeoCustomZoneResponse {
    customZones: GeoCustomZoneGeojsonData;
    customZoneNegative: MultiPolygon;
}
