import { Timestamped, Uuided } from '@/models/data';
import { DetectionWithTile } from '@/models/detection';
import { DetectionObjectMinimal } from '@/models/detection-object';
import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
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
    detection: DetectionWithTile | null;
}

export interface ParcelDetail extends Parcel {
    detectionObjects: ParcelDetectionObject[];
    customGeoZones: GeoCustomZone[];
    communeEnvelope: Polygon;
}
