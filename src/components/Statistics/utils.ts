import { ObjectsFilter } from '@/models/detection-filter';
import { OTHER_OBJECT_TYPE } from '@/utils/constants';
import { formatBigInt } from '@/utils/format';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const valueFormatter = (value: any) => {
    if (typeof value !== 'number') {
        return value;
    }

    return formatBigInt(value);
};

export const objectsFilterToApiParams = (
    objectsFilter: ObjectsFilter,
    tileSetsUuids: string[],
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    otherObjectTypesUuids: Set<string>,
    separateOtherObjectTypes: boolean = false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
        tileSetsUuids: tileSetsUuids.join(','),
        detectionControlStatuses: objectsFilter.detectionControlStatuses.join(','),
        detectionValidationStatuses: objectsFilter.detectionValidationStatuses.join(','),
        score: objectsFilter.score,
        customZonesUuids: objectsFilter.customZonesUuids.join(','),
        communesUuids: communesUuids.join(','),
        departmentsUuids: departmentsUuids.join(','),
        regionsUuids: regionsUuids.join(','),
        interfaceDrawn: objectsFilter.interfaceDrawn,
    };
    const objectTypesUuids = [...objectsFilter.objectTypesUuids];
    const otherTypeIndex = objectTypesUuids.indexOf(OTHER_OBJECT_TYPE.uuid);

    // we replace with other object types if "other" is in filters
    if (otherTypeIndex > -1) {
        objectTypesUuids.splice(otherTypeIndex, 1);

        if (separateOtherObjectTypes) {
            params.otherObjectTypesUuids = Array.from(otherObjectTypesUuids).join(',');
        } else {
            objectTypesUuids.push(...otherObjectTypesUuids);
        }
    }

    params.objectTypesUuids = objectTypesUuids.join(',');

    return params;
};
