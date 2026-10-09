import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { sortCustomZoneLayers, sortTileSetLayers } from '@/utils/layers-order';
import { getInitialObjectFilters } from '@/utils/objects-filter';

interface ObjectTypesInitialState {
    allObjectTypes: ObjectType[];
    visibleObjectTypesUuids: Set<string>;
    otherObjectTypesUuids: Set<string>;
}

export const extractObjectTypesFromSettings = (settings: MapSettings): ObjectTypesInitialState => {
    const allObjectTypes: ObjectType[] = [];
    const visibleObjectTypesUuids = new Set<string>();
    const otherObjectTypesUuids = new Set<string>();

    settings.objectTypeSettings.forEach(({ objectType, objectTypeCategoryObjectTypeStatus }) => {
        allObjectTypes.push(objectType);

        if (objectTypeCategoryObjectTypeStatus === 'VISIBLE') {
            visibleObjectTypesUuids.add(objectType.uuid);
        }

        if (objectTypeCategoryObjectTypeStatus === 'OTHER_CATEGORY') {
            otherObjectTypesUuids.add(objectType.uuid);
        }
    });

    return {
        allObjectTypes,
        visibleObjectTypesUuids: visibleObjectTypesUuids,
        otherObjectTypesUuids: otherObjectTypesUuids,
    };
};

// A zone shows its own description, or else its category's.
const getZoneDescription = (zone: GeoCustomZone, category?: GeoCustomZoneCategory): string | null =>
    zone.description?.trim() || category?.description?.trim() || null;

// A category row lists the distinct descriptions of its zones, in zone order: the category text
// only shows when one of its zones has no description of its own.
export const getInitialMapGeoCustomZoneLayers = (settings: MapSettings): MapGeoCustomZoneLayer[] => {
    return sortCustomZoneLayers([
        ...settings.geoCustomZonesUncategorized.map((zone) => ({
            displayed: false,
            name: zone.name,
            color: zone.color,
            customZoneUuids: [zone.uuid],
            opacity: DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
            description: getZoneDescription(zone),
        })),
        ...settings.geoCustomZoneCategories.map(({ geoCustomZoneCategory, geoCustomZones }) => {
            const descriptions = geoCustomZones
                .map((zone) => getZoneDescription(zone, geoCustomZoneCategory))
                .filter((description): description is string => !!description);

            return {
                displayed: false,
                name: geoCustomZoneCategory.name,
                color: geoCustomZoneCategory.color,
                customZoneUuids: geoCustomZones.map(({ uuid }) => uuid),
                opacity: DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
                description: descriptions.length ? Array.from(new Set(descriptions)).join('\n') : null,
            };
        }),
    ]);
};

// Without an order, the one the agent last gave the « Couches » panel.
export const getInitialMapLayers = (settings: MapSettings, tileSetsOrder?: string[]) => {
    const layers: MapTileSetLayer[] = [];
    const backgroundLayerYears: Set<string> = new Set();
    let layerYearDisplayed: string;

    settings.tileSetSettings.forEach(({ tileSet }) => {
        let displayed = false;

        if (tileSet.tileSetType !== 'BACKGROUND') {
            displayed = tileSet.tileSetStatus === 'VISIBLE';
        } else {
            const layerYear = formatDateOnly(tileSet.date, 'yyyy');
            backgroundLayerYears.add(layerYear);
            if (layerYearDisplayed) {
                displayed = layerYear === layerYearDisplayed;
            } else {
                displayed = true;
                layerYearDisplayed = layerYear;
            }
        }

        layers.push({
            tileSet: { ...tileSet },
            displayed,
        });
    });

    let backgroundLayerYears_ = [...backgroundLayerYears];
    backgroundLayerYears_.sort();
    backgroundLayerYears_ = backgroundLayerYears_.reverse();

    return {
        layers: sortTileSetLayers(layers, tileSetsOrder),
        backgroundLayerYears: backgroundLayerYears_,
    };
};

export const getInitialStatisticsLayers = (settings: MapSettings): MapTileSetLayer[] => {
    const layers: MapTileSetLayer[] = [];

    settings.tileSetSettings.forEach(({ tileSet }) => {
        if (tileSet.tileSetType === 'INDICATIVE') {
            return;
        }

        const displayed = tileSet.tileSetStatus === 'VISIBLE';

        layers.push({
            tileSet: { ...tileSet },
            displayed,
        });
    });

    return layers;
};

export const getCommonMapSettingsData = (settings: MapSettings) => {
    const { allObjectTypes, visibleObjectTypesUuids, otherObjectTypesUuids } = extractObjectTypesFromSettings(settings);
    const initialMapGeoCustomZoneLayers = getInitialMapGeoCustomZoneLayers(settings);
    const { objectsFilter, detectionObjectUuid } = getInitialObjectFilters(
        Array.from(visibleObjectTypesUuids),
        initialMapGeoCustomZoneLayers.map(({ customZoneUuids }) => customZoneUuids).flat(),
        allObjectTypes.map(({ uuid }) => uuid),
    );

    return {
        allObjectTypes,
        visibleObjectTypesUuids,
        otherObjectTypesUuids,
        initialMapGeoCustomZoneLayers,
        objectsFilter,
        detectionObjectUuid,
    };
};
