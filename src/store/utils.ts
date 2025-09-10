import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { getInitialObjectFilters } from '@/utils/objects-filter';
import { format } from 'date-fns';

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

export const getInitialMapGeoCustomZoneLayers = (settings: MapSettings): MapGeoCustomZoneLayer[] => {
    return [
        ...settings.geoCustomZonesUncategorized.map(({ name, color, uuid }) => ({
            displayed: false,
            name,
            color,
            customZoneUuids: [uuid],
        })),
        ...settings.geoCustomZoneCategories.map(({ geoCustomZoneCategory, geoCustomZones }) => ({
            displayed: false,
            name: geoCustomZoneCategory.name,
            color: geoCustomZoneCategory.color,
            customZoneUuids: geoCustomZones.map(({ uuid }) => uuid),
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
            const layerYear = format(tileSet.date, 'yyyy');
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

    // sort years by descinding order
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
