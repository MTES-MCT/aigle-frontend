import { ObjectsFilter } from '@/models/detection-filter';
import { OTHER_OBJECT_TYPE } from '@/utils/constants';

export const objectsFilterToApiParams = (
    objectsFilter: ObjectsFilter,
    otherObjectTypesUuids: Set<string>,
): ObjectsFilter => {
    const objectTypesUuids = [...objectsFilter.objectTypesUuids];
    const otherTypeIndex = objectTypesUuids.indexOf(OTHER_OBJECT_TYPE.uuid);

    // we replace with other object types if "other" is in filters
    if (otherTypeIndex > -1) {
        objectTypesUuids.splice(otherTypeIndex, 1);
        objectTypesUuids.push(...otherObjectTypesUuids);
    }

    return {
        ...objectsFilter,
        objectTypesUuids,
    };
};
