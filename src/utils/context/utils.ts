import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';

export const extractObjectTypesFromSettings = (settings: MapSettings) => {
    const allObjectTypes: ObjectType[] = [];
    const objectTypesUuids = new Set<string>();

    settings.objectTypeSettings.forEach(({ objectType, objectTypeCategoryObjectTypeStatus }) => {
        if (objectTypesUuids.has(objectType.uuid)) {
            return;
        }

        allObjectTypes.push(objectType);

        if (objectTypeCategoryObjectTypeStatus === 'VISIBLE') {
            objectTypesUuids.add(objectType.uuid);
        }
    });

    return {
        allObjectTypes,
        objectTypesUuids: Array.from(objectTypesUuids),
    };
};
