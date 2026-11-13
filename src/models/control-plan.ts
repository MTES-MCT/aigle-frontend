import { Timestamped, Uuided } from '@/models/data';
import { DetectionControlStatus, DetectionValidationStatus } from '@/models/detection';
import { DetectionObjectDetailTilesetPreview } from '@/models/detection-object';
import { UserGroupType } from '@/models/user-group';
import { MultiPolygon, Point, Polygon } from 'geojson';

export const controlPlanStatuses = ['ACTIVE', 'CLOSED'] as const;
export type ControlPlanStatus = (typeof controlPlanStatuses)[number];

export const controlPlanWaveStatuses = ['DRAFT', 'VALIDATED'] as const;
export type ControlPlanWaveStatus = (typeof controlPlanWaveStatuses)[number];

export const controlPlanParcelStatuses = ['PROPOSED', 'EXCLUDED', 'PLANNED', 'REMOVED'] as const;
export type ControlPlanParcelStatus = (typeof controlPlanParcelStatuses)[number];

// PROPOSED and WAITING split the proposals of the draft wave at its parcels count (plus the agent's additions)
export const controlPlanParcelSections = ['PROPOSED', 'WAITING', 'EXCLUDED', 'PLANNED', 'REMOVED'] as const;
export type ControlPlanParcelSection = (typeof controlPlanParcelSections)[number];

export const controlPlanFollowUpStatuses = ['TO_CONTROL', 'CONTROLLED', 'RELEASED'] as const;
export type ControlPlanFollowUpStatus = (typeof controlPlanFollowUpStatuses)[number];

export const controlPlanRankingCriteria = [
    'OBJECTS_COUNT',
    'NEW_OBJECTS_COUNT',
    'OBJECT_TYPE_PRIORITY',
    'SMALL_PARCELS',
] as const;
export type ControlPlanRankingCriterion = (typeof controlPlanRankingCriteria)[number];
// the ones a first wave starts with
export const defaultControlPlanRankingCriteria: ControlPlanRankingCriterion[] = ['OBJECTS_COUNT', 'NEW_OBJECTS_COUNT'];

export const controlPlanValidationStatuses = [
    'DETECTED_NOT_VERIFIED',
    'SUSPECT',
] as const satisfies readonly DetectionValidationStatus[];
export type ControlPlanValidationStatus = (typeof controlPlanValidationStatuses)[number];

export interface ControlPlanGroup {
    uuid: string;
    name: string;
    userGroupType: UserGroupType;
    canEdit: boolean;
    activeControlPlanUuid: string | null;
}

export interface ControlPlanPrerequisites {
    unverifiedObjectsCount: number;
    objectsWithoutParcelCount: number;
    // active zones à enjeux of the group: a wave needs at least one
    customZonesCount: number;
}

// what a wave computed now with these criteria would find, without writing anything
export interface ControlPlanEligibleCount {
    eligibleParcelsCount: number;
    eligibleObjectsCount: number;
}

export interface ControlPlanCriteria {
    // perimeter: both empty means the whole territory of the group
    communesUuids: string[];
    epcisUuids: string[];
    // by priority, for the OBJECT_TYPE_PRIORITY ranking
    objectTypesUuids: string[];
    scoreMin: number;
    validationStatuses: ControlPlanValidationStatus[];
    includePrescribed: boolean;
    // the selected zone groups: a filter, not an order
    customZoneGroups: string[][];
    excludeAuthorizedParcels: boolean;
    excludeOfficialReportParcels: boolean;
    minObjectsCount: number;
    // the active ones, by priority
    rankingCriteria: ControlPlanRankingCriterion[];
}

export interface ControlPlanProposal {
    proposedCount: number;
    waitingCount: number;
    // pulled from the waiting list by an agent, counted in proposedCount
    addedCount: number;
    excludedCount: number;
    objectsCount: number;
    unverifiedObjectsCount: number;
}

export interface ControlPlanWave extends Uuided, Timestamped {
    controlPlanUuid: string;
    number: number;
    controlPlanWaveStatus: ControlPlanWaveStatus;
    criteria: ControlPlanCriteria;
    parcelsCount: number;
    eligibleParcelsCount: number;
    computedAt: string | null;
    validatedAt: string | null;
    proposal: ControlPlanProposal;
}

export interface ControlPlanCounters {
    planned: number;
    toControl: number;
    controlled: number;
    released: number;
    removed: number;
    excluded: number;
}

export interface ControlPlan extends Uuided, Timestamped {
    name: string;
    startDate: string;
    endDate: string;
    controlPlanStatus: ControlPlanStatus;
    userGroup: { uuid: string; name: string };
    closedAt: string | null;
    isExpired: boolean;
    canEdit: boolean;
    validatedWavesCount: number;
    draftWave: ControlPlanWave | null;
    // its criteria prefill the next wave
    lastValidatedWave: ControlPlanWave | null;
    counters: ControlPlanCounters;
}

export interface ControlPlanInput {
    name: string;
    startDate: string;
    endDate: string;
}

export interface ControlPlanCriteriaOptionObjectType {
    uuid: string;
    name: string;
    color: string;
    status: 'VISIBLE' | 'OTHER_CATEGORY' | 'HIDDEN';
}

export interface ControlPlanCriteriaOptionZoneGroup {
    key: string;
    name: string;
    color: string | null;
    customZoneUuids: string[];
}

export interface ControlPlanPerimeterZone {
    uuid: string;
    name: string;
    code: string;
}

export interface ControlPlanCriteriaOptions {
    objectTypes: ControlPlanCriteriaOptionObjectType[];
    customZoneGroups: ControlPlanCriteriaOptionZoneGroup[];
    // the communes or EPCIs of a collectivity group, empty for a DDTM or a department
    defaultPerimeter: { communes: ControlPlanPerimeterZone[]; epcis: ControlPlanPerimeterZone[] };
    // the only commune of the group's territory: no perimeter to choose
    singleCommune: ControlPlanPerimeterZone | null;
}

export interface ControlPlanParcelCommune {
    uuid: string;
    name: string;
    code: string;
}

export interface ControlPlanParcelObjectType {
    uuid: string;
    name: string;
    color: string;
    count: number;
}

export interface ControlPlanParcel extends Uuided {
    controlPlanParcelStatus: ControlPlanParcelStatus;
    rank: number;
    waveNumber: number | null;
    // null once a cadastre re-import dropped the parcel
    parcelUuid: string | null;
    idParcellaire: string;
    prefix: string;
    section: string;
    numParcel: number;
    commune: ControlPlanParcelCommune | null;
    // m², null once a cadastre re-import dropped the parcel
    contenance: number | null;
    objectsCount: number;
    newObjectsCount: number;
    unverifiedObjectsCount: number;
    // pulled from the waiting list by an agent, on top of the parcels count
    addedByAgent: boolean;
    zoneNames: string[];
    objectTypes: ControlPlanParcelObjectType[];
    detectionObjectUuids: string[];
    followUpStatus: ControlPlanFollowUpStatus | null;
    statusChangedAt: string | null;
}

export interface OutOfPlanParcel extends Uuided {
    idParcellaire: string;
    prefix: string;
    section: string;
    numParcel: number;
    commune: ControlPlanParcelCommune;
    zoneNames: string[];
    detectionsCount: number;
    detectionsCountByObjectType: {
        objectTypeName: string;
        objectTypeUuid: string;
        objectTypeColor: string;
        count: number;
    }[];
    detectionObjectUuids: string[];
}

export interface ControlPlanParcelPreviewObject {
    uuid: string;
    objectTypeName: string;
    objectTypeColor: string;
    geometry: Polygon | MultiPolygon | Point;
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
}

export interface ControlPlanParcelPreviewYearObject {
    uuid: string;
    objectTypeName: string;
    objectTypeColor: string;
    geometry: Polygon | MultiPolygon | Point;
}

export interface ControlPlanParcelPreview {
    parcelGeometry: Polygon | MultiPolygon | null;
    bounds: [number, number, number, number] | null;
    // the objects as they are now
    detectionObjects: ControlPlanParcelPreviewObject[];
    // each year with the objects as detected on it
    tileSetPreviews: (DetectionObjectDetailTilesetPreview & {
        detectionObjects: ControlPlanParcelPreviewYearObject[];
    })[];
}

export interface ControlPlanWaveInput {
    parcelsCount: number;
    criteria: ControlPlanCriteria;
}

export interface ControlPlanValidationReport {
    plannedParcelsCount: number;
    switchedObjectsCount: number;
    skippedParcels: { idParcellaire: string; communeName: string | null }[];
}
