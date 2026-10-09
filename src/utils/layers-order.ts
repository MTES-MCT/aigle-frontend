import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType } from '@/models/tile-set';

// The order the agent gave the « Couches » panel rows, kept in this browser only.
const STORAGE_KEY = 'aigle.layers-order';

interface LayersOrder {
    tileSets: string[];
    customZoneLayers: string[];
}

// the panel sections whose rows can be reordered
const SORTABLE_TILE_SET_TYPES: TileSetType[] = ['PARTIAL', 'INDICATIVE'];

// A zone layer has no id of its own: a category row is the set of its zones.
export const getCustomZoneLayerKey = ({ customZoneUuids }: Pick<MapGeoCustomZoneLayer, 'customZoneUuids'>) =>
    [...customZoneUuids].sort().join(',');

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

const getStoredLayersOrder = (): LayersOrder => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

        return {
            tileSets: isStringArray(stored?.tileSets) ? stored.tileSets : [],
            customZoneLayers: isStringArray(stored?.customZoneLayers) ? stored.customZoneLayers : [],
        };
    } catch {
        return { tileSets: [], customZoneLayers: [] };
    }
};

// Keys missing from the current list (another account or scope) are kept: they only ever rank among themselves.
const storeLayersOrder = (field: keyof LayersOrder, keys: string[]) => {
    const stored = getStoredLayersOrder();
    const current = new Set(keys);

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...stored, [field]: [...keys, ...stored[field].filter((key) => !current.has(key))] }),
        );
    } catch {
        // no storage: the order lasts until the page is reloaded
    }
};

export const storeTileSetLayersOrder = (layers: MapTileSetLayer[]) =>
    storeLayersOrder(
        'tileSets',
        layers
            .filter(({ tileSet }) => SORTABLE_TILE_SET_TYPES.includes(tileSet.tileSetType))
            .map(({ tileSet }) => tileSet.uuid),
    );

export const storeCustomZoneLayersOrder = (layers: MapGeoCustomZoneLayer[]) =>
    storeLayersOrder('customZoneLayers', layers.map(getCustomZoneLayerKey));

// Known keys first, in the given order; the others keep their relative order after them.
const sortByKeys = <T>(items: T[], getKey: (item: T) => string, keys: string[]): T[] => {
    const ranks = new Map(keys.map((key, index) => [key, index]));

    return items
        .map((item, index) => ({ item, rank: ranks.get(getKey(item)) ?? keys.length + index }))
        .sort((a, b) => a.rank - b.rank)
        .map(({ item }) => item);
};

// Reorders the items `matches` picks inside the slots they already hold, everything else stays in place.
const reorderInPlace = <T>(items: T[], matches: (item: T) => boolean, reorder: (matching: T[]) => T[]): T[] => {
    const reordered = reorder(items.filter(matches));
    let index = 0;

    return items.map((item) => (matches(item) ? reordered[index++] : item));
};

const moveItem = <T>(items: T[], from: number, to: number): T[] => {
    const moved = [...items];
    moved.splice(to, 0, ...moved.splice(from, 1));

    return moved;
};

// Each type keeps its slots in the layers: the stacking between types never changes.
export const sortTileSetLayers = (
    layers: MapTileSetLayer[],
    uuids: string[] = getStoredLayersOrder().tileSets,
): MapTileSetLayer[] =>
    SORTABLE_TILE_SET_TYPES.reduce(
        (sorted, type) =>
            reorderInPlace(
                sorted,
                ({ tileSet }) => tileSet.tileSetType === type,
                (typeLayers) => sortByKeys(typeLayers, ({ tileSet }) => tileSet.uuid, uuids),
            ),
        layers,
    );

export const sortCustomZoneLayers = (layers: MapGeoCustomZoneLayer[]): MapGeoCustomZoneLayer[] =>
    sortByKeys(layers, getCustomZoneLayerKey, getStoredLayersOrder().customZoneLayers);

// Moves the layer to the place the target holds among the layers of its type.
export const getTileSetLayersMoved = (
    layers: MapTileSetLayer[],
    uuid: string,
    targetUuid: string,
): MapTileSetLayer[] => {
    const layer = layers.find(({ tileSet }) => tileSet.uuid === uuid);

    if (!layer) {
        return layers;
    }

    return reorderInPlace(
        layers,
        ({ tileSet }) => tileSet.tileSetType === layer.tileSet.tileSetType,
        (typeLayers) => {
            const to = typeLayers.findIndex(({ tileSet }) => tileSet.uuid === targetUuid);

            return to === -1 ? typeLayers : moveItem(typeLayers, typeLayers.indexOf(layer), to);
        },
    );
};

export const getCustomZoneLayersMoved = (
    layers: MapGeoCustomZoneLayer[],
    uuids: string[],
    targetUuids: string[],
): MapGeoCustomZoneLayer[] => {
    const findIndex = (customZoneUuids: string[]) => {
        const key = getCustomZoneLayerKey({ customZoneUuids });
        return layers.findIndex((layer) => getCustomZoneLayerKey(layer) === key);
    };
    const from = findIndex(uuids);
    const to = findIndex(targetUuids);

    return from === -1 || to === -1 || from === to ? layers : moveItem(layers, from, to);
};
