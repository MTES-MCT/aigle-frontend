import { Timestamped, Uuided } from '@/models/data';
import { DetectionWithTile } from '@/models/detection';
import { DetectionObjectDetailTilesetPreview, DetectionObjectMinimal } from '@/models/detection-object';
import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoCustomZoneWithSubZones } from '@/models/geo/geo-custom-zone';
import { Polygon } from 'geojson';

export interface ParcelMinimal extends Uuided, Timestamped {
    idParcellaire: string;
    prefix: string;
    section: string;
    numParcel: number;
}

export interface ParcelWithCommuneSerializer extends ParcelMinimal {
    commune: GeoCommune;
}

export interface Parcel extends ParcelMinimal {
    geometry: Polygon;
}

export interface ParcelDetectionObject extends DetectionObjectMinimal {
    detections: DetectionWithTile[];
}

export interface ParcelListItem extends ParcelWithCommuneSerializer {
    zoneNames: string[];
    detectionsCount: number;
}

export interface ParcelDetail extends Parcel, ParcelWithCommuneSerializer {
    detectionsUpdatedAt: string;
    tileSetPreviews: DetectionObjectDetailTilesetPreview[];
    detectionObjects: ParcelDetectionObject[];
    customGeoZones: GeoCustomZoneWithSubZones[];
    communeEnvelope: Polygon;
}

export interface ParcelOverview {
    notVerified: number;
    verified: number;
    total: number;
}
