import { TileSet } from '@/models/tile-set';

interface MapLayer {
    displayed: boolean;
}

export interface MapTileSetLayer extends MapLayer {
    tileSet: TileSet;
}

export interface MapGeoCustomZoneLayer extends MapLayer {
    customZoneUuids: string[];
    name: string;
    color: string;
}
