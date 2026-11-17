import { Timestamped, Uuided } from '@/models/data';
import { GeoZone } from '@/models/geo/geo-zone';
import { ObjectType } from '@/models/object-type';
import { TileSet } from '@/models/tile-set';

// one per object type prescribable when the report was computed
export interface DetectionTypeOverlapReportObjectType {
    objectType: ObjectType;
    overlappingCount: number;
    customZonesOverlappingCount: number;
}

// Detections of the zone's latest year overlapping a detection of another object type.
// The figures outside zones à enjeux are the overall ones minus the customZones ones.
export interface DetectionTypeOverlapReport extends Uuided, Timestamped {
    geoZone: GeoZone;
    reportDate: string;
    tileSets: TileSet[];
    detectionsCount: number;
    overlappingCount: number;
    overlappingPrescribableCount: number;
    customZonesDetectionsCount: number;
    customZonesOverlappingCount: number;
    customZonesOverlappingPrescribableCount: number;
    objectTypes: DetectionTypeOverlapReportObjectType[];
}
