import { Timestamped, Uuided } from '@/models/data';
import { DetectionObjectDetail } from '@/models/detection-object';
import { Tile } from '@/models/tile';
import { TileSet, TileSetType } from '@/models/tile-set';
import { FeatureCollection, Polygon } from 'geojson';

export const detectionControlStatuses = [
    'NOT_CONTROLLED',
    'SIGNALED_COLLECTIVITY',
    'SIGNALED_COMMUNE',
    'CONTROLLED_FIELD',
    'PRIOR_LETTER_SENT',
    'OFFICIAL_REPORT_DRAWN_UP',
    'OBSERVARTION_REPORT_REDACTED',
    'VERBALIZED',
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
    userLastUpdateUuid: string;
}

export interface DetectionDetail extends Uuided, Timestamped {
    geometry: Polygon;
    score: number;
    detectionSource: DetectionSource;
    detectionData: DetectionData;
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
