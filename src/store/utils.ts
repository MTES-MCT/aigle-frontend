import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { getInitialObjectFilters } from '@/utils/objects-filter';

interface ObjectTypesInitialState {
    allObjectTypes: ObjectType[];
    visibleObjectTypesUuids: Set<string>;
    otherObjectTypesUuids: Set<string>;
}

const extractObjectTypesFromSettings = (settings: MapSettings): ObjectTypesInitialState => {
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

// A layer row is one uncategorized zone or a whole category, and both the category and each
// zone under it can carry a description: distinct non-empty lines, category text first.
const joinDescriptions = (descriptions: (string | null | undefined)[]): string | null => {
    const lines = Array.from(new Set(descriptions.map((description) => (description || '').trim()).filter(Boolean)));

    return lines.length ? lines.join('\n') : null;
};

const getInitialMapGeoCustomZoneLayers = (settings: MapSettings): MapGeoCustomZoneLayer[] => {
    return [
        ...settings.geoCustomZonesUncategorized.map((zone) => ({
            displayed: false,
            name: zone.name,
            color: zone.color,
            customZoneUuids: [zone.uuid],
            opacity: DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
            description: joinDescriptions([zone.description]),
        })),
        ...settings.geoCustomZoneCategories.map(({ geoCustomZoneCategory, geoCustomZones }) => ({
            displayed: false,
            name: geoCustomZoneCategory.name,
            color: geoCustomZoneCategory.color,
            customZoneUuids: geoCustomZones.map(({ uuid }) => uuid),
            opacity: DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
            description: joinDescriptions([
                geoCustomZoneCategory.description,
                ...geoCustomZones.map(({ description }) => description),
            ]),
        })),
    ];
};

export const getInitialMapLayers = (settings: MapSettings) => {
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
        layers,
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
