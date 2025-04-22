import { Timestamped, Uuided } from '@/models/data';
import { DetectionObjectDetail } from '@/models/detection-object';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectType } from '@/models/object-type';
import { ParcelMinimal } from '@/models/parcel';
import { Tile } from '@/models/tile';
import { TileSet, TileSetType } from '@/models/tile-set';
import { FeatureCollection, Polygon } from 'geojson';

export const detectionControlStatuses = [
    'NOT_CONTROLLED',
    'CONTROLLED_FIELD',
    'PRIOR_LETTER_SENT',
    'OFFICIAL_REPORT_DRAWN_UP',
    'ADMINISTRATIVE_CONSTRAINT',
    'OBSERVARTION_REPORT_REDACTED',
    'REHABILITATED',
] as const;
export type DetectionControlStatus = (typeof detectionControlStatuses)[number];

export const detectionValidationStatuses = ['DETECTED_NOT_VERIFIED', 'SUSPECT', 'LEGITIMATE', 'INVALIDATED'] as const;
export type DetectionValidationStatus = (typeof detectionValidationStatuses)[number];

export const detectionPrescriptionStatuses = ['PRESCRIBED', 'NOT_PRESCRIBED'] as const;
export type DetectionPrescriptionStatus = (typeof detectionPrescriptionStatuses)[number];

export const detectionSources = ['INTERFACE_DRAWN', 'ANALYSIS'];
export type DetectionSource = (typeof detectionSources)[number];

export interface DetectionProperties {
    uuid: string;
    detectionObjectUuid: string;
    objectTypeUuid: string;
    objectTypeColor: string;
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
    detectionPrescriptionStatus: DetectionPrescriptionStatus | null;
    tileSetType: TileSetType;
}

export interface DetectionGeojsonData extends FeatureCollection<Polygon, DetectionProperties> {}

export interface DetectionData extends Uuided, Timestamped {
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
    detectionPrescriptionStatus: DetectionPrescriptionStatus | null;
    officialReportDate: string | null;
    userLastUpdateUuid: string;
}

export interface Detection extends Uuided, Timestamped {
    geometry: Polygon;
    score: number;
    detectionSource: DetectionSource;
    detectionData: DetectionData;
}

export interface DetectionDetail extends Detection {
    detectionObject: Omit<DetectionObjectDetail, 'detections'>;
}

export interface DetectionWithTileMinimal extends Uuided, Timestamped {
    geometry: Polygon;
    score: number;
    detectionSource: DetectionSource;
    detectionData: DetectionData;
    tile: Tile;
}

export interface DetectionWithTile extends DetectionWithTileMinimal {
    tileSet: TileSet;
}

export interface DetectionListItem extends Uuided {
    id: number;
    detectionObjectId: number;
    detectionObjectUuid: string;
    score: number;
    address: string | null;
    parcel: ParcelMinimal | null;
    geoCustomZones: GeoCustomZone[];
    objectType: ObjectType;
    detectionSource: DetectionSource;
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
    detectionPrescriptionStatus: DetectionPrescriptionStatus;
    tileSets: TileSet[];
    communeIsoCode: string;
    communeName: string;
}
