import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';

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
