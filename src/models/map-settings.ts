import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';
import { ObjectType } from '@/models/object-type';
import { ObjectTypeCategoryObjectTypeStatus } from '@/models/object-type-category';
import { TileSet } from '@/models/tile-set';
import { Geometry } from 'geojson';

export interface TileSetSetting {
    tileSet: TileSet;
    geometry: Geometry;
}

export interface ObjectTypeSetting {
    objectType: ObjectType;
    objectTypeCategoryObjectTypeStatus: ObjectTypeCategoryObjectTypeStatus;
}

export interface GeoCustomZoneCategorySetting {
    geoCustomZoneCategory: GeoCustomZoneCategory;
    geoCustomZones: GeoCustomZone[];
}

export interface MapSettings {
    objectTypeSettings: ObjectTypeSetting[];
    tileSetSettings: TileSetSetting[];
    globalGeometry: Geometry | null;
    geoCustomZonesUncategorized: GeoCustomZone[];
    geoCustomZoneCategories: GeoCustomZoneCategorySetting[];
    userLastPosition: GeoJSON.Position | null;
}
