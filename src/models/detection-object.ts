import { Timestamped, Uuided } from '@/models/data';
import { DetectionWithTile, DetectionWithTileMinimal } from '@/models/detection';
import { GeoCustomZoneWithSubZones } from '@/models/geo/geo-custom-zone';
import { ObjectType } from '@/models/object-type';
import { ParcelWithCommuneSerializer } from '@/models/parcel';
import { TileSet } from '@/models/tile-set';
import { UserGroupRight } from '@/models/user';
import { UserGroup } from '@/models/user-group';

export interface DetectionObjectDetailTilesetPreview {
    preview: boolean;
    tileSet: TileSet;
}

export interface DetectionObjectMinimal extends Uuided, Timestamped {
    id: number;
    address: string;
    comment: string;
    objectType: ObjectType;
}

export interface DetectionObjectDetail extends DetectionObjectMinimal {
    detections: DetectionWithTile[];
    tileSets: DetectionObjectDetailTilesetPreview[];
    parcel: ParcelWithCommuneSerializer | null;
    userGroupRights: UserGroupRight[];
    geoCustomZones: GeoCustomZoneWithSubZones[];
    userGroupLastUpdate: UserGroup | null;
}

export interface DetectionObjectHistoryItem {
    detection?: DetectionWithTileMinimal;
    tileSet: TileSet;
}

export interface DetectionObjectHistory extends Uuided, Timestamped {
    detections: DetectionObjectHistoryItem[];
    id: number;
    address: string;
    comment: string;
    objectType: ObjectType;
    tileSets: TileSet[];
}
