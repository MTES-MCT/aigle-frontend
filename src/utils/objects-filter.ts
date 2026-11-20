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
export const CONTROL_PLAN_PARAM = 'controlPlan';
export const CONTROL_PLAN_UUID_PARAM = 'controlPlanUuid';

// A link carrying the filter to someone without the feature falls back to the whole territory.
// The access is passed in: importing the auth store here makes an import cycle (auth > tracking > presets).
const isControlPlanParamApplied = (params: QueryParams, canAccessControlPlan: boolean) =>
    params[CONTROL_PLAN_PARAM] === 'true' && canAccessControlPlan;

/**
 * `objectTypesUuids` make the default filter, `knownObjectTypesUuids` are all the object types of
 * the settings, hidden ones included: a filter may hold any of them.
 */
export const getInitialObjectFilters = (
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
    canAccessControlPlan: boolean,
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
        objectsFilter: paramsToObjectsFilter(
            params,
            objectTypesUuids,
            customZonesUuids,
            knownObjectTypesUuids,
            canAccessControlPlan,
        ),
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
    // only written when on, so that the urls of everyone else stay as they were
    if (!objectsFilter.controlPlan) {
        url.searchParams.delete(CONTROL_PLAN_PARAM);
    }
    if (!objectsFilter.controlPlan || !objectsFilter.controlPlanUuid) {
        url.searchParams.delete(CONTROL_PLAN_UUID_PARAM);
    }

    window.history.replaceState({}, '', url.toString());
};

// The view the agent last picked between its control plans and all the parcels: the Suivi page opens on the
// plans unless « Toutes les parcelles » was chosen.
const CONTROL_PLAN_VIEW_STORAGE_KEY = 'aigle.control-plan-view';

export const rememberControlPlanView = (controlPlan: boolean) => {
    try {
        localStorage.setItem(CONTROL_PLAN_VIEW_STORAGE_KEY, controlPlan ? 'PLANS' : 'ALL');
    } catch {
        // storage unavailable: the Suivi page opens on the plans again
    }
};

// `controlPlan=false`: a link to a filter over all the parcels, which the Suivi page must not narrow to the
// plans. Read at page load: the bootstrap rewrites the query from the filter, which drops the param.
const ALL_PARCELS_VIEW_REQUESTED = new URLSearchParams(window.location.search).get(CONTROL_PLAN_PARAM) === 'false';

export const isAllParcelsViewRequested = () => ALL_PARCELS_VIEW_REQUESTED;

export const isAllParcelsViewChosen = () => {
    try {
        return localStorage.getItem(CONTROL_PLAN_VIEW_STORAGE_KEY) === 'ALL';
    } catch {
        return false;
    }
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
    controlPlan: false,
    controlPlanUuid: null,
});

const paramsToObjectsFilter = (
    params: QueryParams,
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
    canAccessControlPlan: boolean,
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

        controlPlan: isControlPlanParamApplied(params, canAccessControlPlan),
        // a plan that is closed meanwhile is dropped once the active plans are known
        controlPlanUuid:
            isControlPlanParamApplied(params, canAccessControlPlan) &&
            isValidUUID(params[CONTROL_PLAN_UUID_PARAM] ?? '')
                ? params[CONTROL_PLAN_UUID_PARAM]
                : null,
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
        ...(objectsFilter.controlPlan ? { [CONTROL_PLAN_PARAM]: 'true' } : {}),
        ...(objectsFilter.controlPlan && objectsFilter.controlPlanUuid
            ? { [CONTROL_PLAN_UUID_PARAM]: objectsFilter.controlPlanUuid }
            : {}),
    };
};

export type ObjectsFilterLinkDimension = 'statuses' | 'objectTypes' | 'zones' | 'controlPlan';

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

/** The score and `interfaceDrawn` are left out: only what the agent selects in the filter lists counts. */
export const isObjectsFilterDefault = (
    objectsFilter: ObjectsFilter,
    defaultObjectTypesUuids: string[],
    defaultCustomZonesUuids: string[],
): boolean =>
    haveSameValues(objectsFilter.objectTypesUuids, defaultObjectTypesUuids) &&
    haveSameValues(objectsFilter.detectionValidationStatuses, DEFAULT_DETECTION_VALIDATION_STATUSES) &&
    haveSameValues(objectsFilter.detectionControlStatuses, DEFAULT_DETECTION_CONTROL_STATUSES) &&
    objectsFilter.prescripted === DEFAULT_PRESCRIPTED &&
    haveSameValues(objectsFilter.customZonesUuids, defaultCustomZonesUuids) &&
    !objectsFilter.controlPlan;

/**
 * What a landing query string (a shared link, a bookmark) turns into, compared with the default
 * filter. `knownObjectTypesUuids` are all the object types of the settings, hidden ones included.
 */
export const getObjectsFilterLink = (
    search: string,
    objectTypesUuids: string[],
    customZonesUuids: string[],
    knownObjectTypesUuids: string[],
    canAccessControlPlan: boolean,
): ObjectsFilterLink => {
    const params = Object.fromEntries(new URLSearchParams(search));
    const objectsFilter = paramsToObjectsFilter(
        params,
        objectTypesUuids,
        customZonesUuids,
        knownObjectTypesUuids,
        canAccessControlPlan,
    );
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
        objectsFilter.interfaceDrawn !== objectsFilterDefault.interfaceDrawn ||
        !!objectsFilter.controlPlan;

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
    if (params[CONTROL_PLAN_PARAM] === 'true' && !objectsFilter.controlPlan) {
        unresolved.push('controlPlan');
    }

    return { objectsFilter, differsFromDefault, scopeChanged, unresolved };
};
