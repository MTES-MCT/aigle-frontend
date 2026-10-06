import {
    DetectionControlStatus,
    detectionControlStatuses,
    DetectionValidationStatus,
    detectionValidationStatuses,
} from '@/models/detection';
import { InterfaceDrawnFilter, ObjectsFilter } from '@/models/detection-filter';
import { OTHER_OBJECT_TYPE } from '@/utils/constants';
import { isValidUUID, stringToArray, stringToBoolean, stringToTypedArray } from '@/utils/string';
import { xor } from 'lodash';

type QueryParams = Record<string, string>;

const DETECTION_OBJECT_UUID_PARAM = 'detectionObjectUuid';

/**
 * `objectTypesUuids` make the default filter, `knownObjectTypesUuids` are all the object types of
 * the settings, hidden ones included: a filter may hold any of them.
 */
export const getInitialObjectFilters = (
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
): {
    objectsFilter: ObjectsFilter;
    detectionObjectUuid?: string;
} => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    let detectionObjectUuid: string | undefined = undefined;
    const detectionObjectUuidParam = params[DETECTION_OBJECT_UUID_PARAM];
    if (detectionObjectUuidParam && isValidUUID(detectionObjectUuidParam)) {
        detectionObjectUuid = detectionObjectUuidParam;
    }
    return {
        objectsFilter: paramsToObjectsFilter(params, objectTypesUuids, customZonesUuids, knownObjectTypesUuids),
        detectionObjectUuid,
    };
};

// Once the bootstrap has read it: left in the url, a reload, a bookmark or the header links (which
// carry the query over) would open that object again.
export const removeDetectionObjectUuidFromUrl = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(DETECTION_OBJECT_UUID_PARAM)) {
        return;
    }

    url.searchParams.delete(DETECTION_OBJECT_UUID_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
};

export const setObjectFilters = (objectsFilter: ObjectsFilter) => {
    const params = objectsFilterToParams(objectsFilter);
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    window.history.replaceState({}, '', url.toString());
};

export const DEFAULT_DETECTION_VALIDATION_STATUSES: DetectionValidationStatus[] = [
    'DETECTED_NOT_VERIFIED',
    'SUSPECT',
    'ILLEGAL',
];
export const DEFAULT_DETECTION_CONTROL_STATUSES: DetectionControlStatus[] = detectionControlStatuses.filter(
    (status) => status !== 'REHABILITATED',
);
export const DEFAULT_PRESCRIPTED = false;

const getObjectsFilterDefault = (objectTypesUuids: string[], customZonesUuids: string[]): ObjectsFilter => ({
    objectTypesUuids: objectTypesUuids,
    detectionValidationStatuses: DEFAULT_DETECTION_VALIDATION_STATUSES,
    detectionControlStatuses: DEFAULT_DETECTION_CONTROL_STATUSES,
    score: 0.3,
    prescripted: DEFAULT_PRESCRIPTED,
    interfaceDrawn: 'ALL',
    customZonesUuids: customZonesUuids,
});

const paramsToObjectsFilter = (
    params: QueryParams,
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
): ObjectsFilter => {
    const objectsFilterDefault = getObjectsFilterDefault(objectTypesUuids, customZonesUuids);

    // An empty custom-zone filter is no longer a valid state (empty => 400, blocked map).
    // A stale/shared URL with an empty or fully-unresolvable param falls back to the default.
    const parsedCustomZones = stringToTypedArray(customZonesUuids, params.customZonesUuids);

    return {
        objectTypesUuids:
            stringToTypedArray([...knownObjectTypesUuids, OTHER_OBJECT_TYPE.uuid], params.objectTypesUuids) ||
            objectsFilterDefault.objectTypesUuids,

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
            parsedCustomZones && parsedCustomZones.length ? parsedCustomZones : objectsFilterDefault.customZonesUuids,
    };
};

const objectsFilterToParams = (objectsFilter: ObjectsFilter): QueryParams => {
    return {
        objectTypesUuids: objectsFilter.objectTypesUuids.join(','),
        detectionValidationStatuses: objectsFilter.detectionValidationStatuses.join(','),
        detectionControlStatuses: objectsFilter.detectionControlStatuses.join(','),
        score: objectsFilter.score.toString(),
        prescripted: String(objectsFilter.prescripted),
        interfaceDrawn: 'ALL',
        customZonesUuids: objectsFilter.customZonesUuids.join(','),
    };
};

export type ObjectsFilterLinkDimension = 'statuses' | 'objectTypes' | 'zones';

export interface ObjectsFilterLink {
    objectsFilter: ObjectsFilter;
    differsFromDefault: boolean;
    // Object types or zones other than the default ones.
    scopeChanged: boolean;
    // Values of the link this user's settings do not know (another group's zone, a deleted type): dropped silently.
    unresolved: ObjectsFilterLinkDimension[];
}

const haveSameValues = <T>(first: T[], second: T[]) => xor(first, second).length === 0;

const hasUnknownValues = (text: string | undefined, knownValues: readonly string[]) =>
    (stringToArray(text) ?? []).some((value) => !knownValues.includes(value));

/**
 * What a landing query string (a shared link, a bookmark) turns into, compared with the default
 * filter. `knownObjectTypesUuids` are all the object types of the settings, hidden ones included.
 */
export const getObjectsFilterLink = (
    search: string,
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
): ObjectsFilterLink => {
    const params = Object.fromEntries(new URLSearchParams(search));
    const objectsFilter = paramsToObjectsFilter(params, objectTypesUuids, customZonesUuids, knownObjectTypesUuids);
    const objectsFilterDefault = getObjectsFilterDefault(objectTypesUuids, customZonesUuids);

    const scopeChanged =
        !haveSameValues(objectsFilter.objectTypesUuids, objectsFilterDefault.objectTypesUuids) ||
        !haveSameValues(objectsFilter.customZonesUuids, objectsFilterDefault.customZonesUuids);
    const differsFromDefault =
        scopeChanged ||
        !haveSameValues(objectsFilter.detectionValidationStatuses, objectsFilterDefault.detectionValidationStatuses) ||
        !haveSameValues(objectsFilter.detectionControlStatuses, objectsFilterDefault.detectionControlStatuses) ||
        objectsFilter.score !== objectsFilterDefault.score ||
        objectsFilter.prescripted !== objectsFilterDefault.prescripted ||
        objectsFilter.interfaceDrawn !== objectsFilterDefault.interfaceDrawn;

    const unresolved: ObjectsFilterLinkDimension[] = [];
    if (
        hasUnknownValues(params.detectionValidationStatuses, detectionValidationStatuses) ||
        hasUnknownValues(params.detectionControlStatuses, detectionControlStatuses)
    ) {
        unresolved.push('statuses');
    }
    if (hasUnknownValues(params.objectTypesUuids, [...knownObjectTypesUuids, OTHER_OBJECT_TYPE.uuid])) {
        unresolved.push('objectTypes');
    }
    if (hasUnknownValues(params.customZonesUuids, customZonesUuids)) {
        unresolved.push('zones');
    }

    return { objectsFilter, differsFromDefault, scopeChanged, unresolved };
};
