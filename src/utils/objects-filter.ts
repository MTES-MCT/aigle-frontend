import {
    DetectionControlStatus,
    detectionControlStatuses,
    DetectionValidationStatus,
    detectionValidationStatuses,
} from '@/models/detection';
import { InterfaceDrawnFilter, ObjectsFilter } from '@/models/detection-filter';
import { stringToBoolean, stringToTypedArray } from '@/utils/string';

type QueryParams = Record<string, string>;

export const getInitialObjectFilters = (objectTypesUuids: string[], customZonesUuids: string[]) => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    return paramsToObjectsFilter(params, objectTypesUuids, customZonesUuids);
};

export const setObjectFilters = (objectsFilter: ObjectsFilter) => {
    const params = objectsFilterToParams(objectsFilter);
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    window.history.replaceState({}, '', url.toString());
};

const getObjectsFilterDefault = (objectTypesUuids: string[], customZonesUuids: string[]): ObjectsFilter => ({
    objectTypesUuids: objectTypesUuids,
    detectionValidationStatuses: ['DETECTED_NOT_VERIFIED', 'SUSPECT'],
    detectionControlStatuses: detectionControlStatuses.filter((status) => status !== 'REHABILITATED'),
    score: 0.3,
    prescripted: false,
    interfaceDrawn: 'ALL',
    customZonesUuids: customZonesUuids,
});

const paramsToObjectsFilter = (
    params: QueryParams,
    objectTypesUuids: string[],
    customZonesUuids: string[],
): ObjectsFilter => {
    const objectsFilterDefault = getObjectsFilterDefault(objectTypesUuids, customZonesUuids);

    return {
        objectTypesUuids:
            stringToTypedArray(objectTypesUuids, params.objectTypesUuids) || objectsFilterDefault.objectTypesUuids,

        detectionValidationStatuses:
            stringToTypedArray<DetectionValidationStatus>(
                detectionValidationStatuses,
                params.detectionValidationStatuses,
            ) || objectsFilterDefault.detectionValidationStatuses,

        detectionControlStatuses:
            stringToTypedArray<DetectionControlStatus>(detectionControlStatuses, params.detectionControlStatuses) ||
            objectsFilterDefault.detectionControlStatuses,

        score: parseFloat(params.score) || objectsFilterDefault.score,

        prescripted: stringToBoolean(params.prescripted, objectsFilterDefault.prescripted),

        interfaceDrawn: (params.interfaceDrawn || objectsFilterDefault.interfaceDrawn) as InterfaceDrawnFilter,

        customZonesUuids:
            stringToTypedArray(customZonesUuids, params.customZonesUuids) || objectsFilterDefault.customZonesUuids,
    };
};

const objectsFilterToParams = (objectsFilter: ObjectsFilter): QueryParams => {
    return {
        objectTypesUuids: objectsFilter.objectTypesUuids.join(','),
        detectionValidationStatuses: objectsFilter.detectionValidationStatuses.join(','),
        detectionControlStatuses: objectsFilter.detectionControlStatuses.join(','),
        score: objectsFilter.score.toString(),
        prescripted: String(objectsFilter.prescripted),
        interfaceDrawn: objectsFilter.interfaceDrawn,
        customZonesUuids: objectsFilter.customZonesUuids.join(','),
    };
};