import { Timestamped, Uuided, WithCollectivities } from '@/models/data';
import { Geometry } from 'geojson';

export const tileSetStatuses = ['VISIBLE', 'HIDDEN', 'DEACTIVATED'] as const;
export type TileSetStatus = (typeof tileSetStatuses)[number];

export const tileSetSchemes = ['tms', 'xyz'] as const;
export type TileSetScheme = (typeof tileSetSchemes)[number];

export const tileSetTypes = ['BACKGROUND', 'PARTIAL', 'INDICATIVE'] as const;
export type TileSetType = (typeof tileSetTypes)[number];

export interface TileSet extends Uuided, Timestamped {
    date: string;
    name: string;
    url: string;
    tileSetStatus: TileSetStatus;
    tileSetScheme: TileSetScheme;
    tileSetType: TileSetType;
    minZoom: number | null;
    maxZoom: number | null;
    geometry?: Geometry;
    monochrome: boolean;
}

export interface TileSetDetail extends TileSet, WithCollectivities {
    id: number;
    lastImportEndedAt: string | null;
    lastImportStartedAt: string | null;
    detectionsCount: number;
}

export interface TileSetDetailWithGeometry extends TileSetDetail {
    geometry: Geometry;
}
