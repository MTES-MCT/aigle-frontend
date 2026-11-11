import {
    ControlPlanCriteria,
    ControlPlanCriteriaOptions,
    ControlPlanCriteriaOptionZoneGroup,
    controlPlanRankingCriteria,
    ControlPlanRankingCriterion,
    ControlPlanValidationStatus,
    controlPlanValidationStatuses,
    ControlPlanWaveInput,
} from '@/models/control-plan';
import { RANKING_CRITERIA_LABELS } from '@/routes/ControlPlan/utils';
import { DETECTION_VALIDATION_STATUSES_NAMES_MAP, OTHER_OBJECT_TYPE } from '@/utils/constants';

export const DEFAULT_SCORE_MIN = 0.3;
export const DEFAULT_PARCELS_COUNT = 50;
export const MAX_PARCELS_COUNT = 5000;

export interface ZoneGroupRow extends ControlPlanCriteriaOptionZoneGroup {
    selected: boolean;
}

export interface RankingCriterionRow {
    criterion: ControlPlanRankingCriterion;
    active: boolean;
}

export interface CriteriaFormState {
    communesUuids: string[];
    epcisUuids: string[];
    // as the filters panel shows them: OTHER_OBJECT_TYPE.uuid stands for the « Autres » types
    objectTypesUuids: string[];
    scoreMin: number;
    validationStatuses: ControlPlanValidationStatus[];
    includePrescribed: boolean;
    // every zone group of the plan's group, in the order of the options
    zoneGroups: ZoneGroupRow[];
    excludeAuthorizedParcels: boolean;
    excludeOfficialReportParcels: boolean;
    minObjectsCount: number;
    rankingCriteria: RankingCriterionRow[];
    parcelsCount: number;
}

export type CriteriaFormErrors = Partial<Record<keyof CriteriaFormState, string>>;

const getOtherObjectTypesUuids = (options: ControlPlanCriteriaOptions) =>
    options.objectTypes.filter(({ status }) => status === 'OTHER_CATEGORY').map(({ uuid }) => uuid);

const toDisplayedObjectTypesUuids = (options: ControlPlanCriteriaOptions, objectTypesUuids: string[]) => {
    const otherUuids = new Set(getOtherObjectTypesUuids(options));
    const displayed = objectTypesUuids.filter((uuid) => !otherUuids.has(uuid));

    return objectTypesUuids.some((uuid) => otherUuids.has(uuid)) ? [...displayed, OTHER_OBJECT_TYPE.uuid] : displayed;
};

// Every zone group is ticked by default; a previous wave ticks those it picked (a zone it did not know stays unticked).
const getZoneGroupRows = (options: ControlPlanCriteriaOptions, criteria?: ControlPlanCriteria): ZoneGroupRow[] => {
    const pickedUuids = criteria ? new Set(criteria.customZoneGroups.flat()) : null;

    return options.customZoneGroups.map((group) => ({
        ...group,
        selected: !pickedUuids || group.customZoneUuids.some((uuid) => pickedUuids.has(uuid)),
    }));
};

const getRankingCriteriaRows = (criteria?: ControlPlanCriteria): RankingCriterionRow[] => {
    // a wave stored before a criterion was dropped may still name it
    const active = criteria
        ? criteria.rankingCriteria.filter((criterion) => controlPlanRankingCriteria.includes(criterion))
        : [...controlPlanRankingCriteria];

    return [
        ...active.map((criterion) => ({ criterion, active: true })),
        ...controlPlanRankingCriteria
            .filter((criterion) => !active.includes(criterion))
            .map((criterion) => ({ criterion, active: false })),
    ];
};

// The names the perimeter selects show for the zones of the default perimeter.
export const getDefaultPerimeterLabels = ({ defaultPerimeter }: ControlPlanCriteriaOptions): Record<string, string> =>
    Object.fromEntries(
        // as geoZoneToGeoOption labels them
        [...defaultPerimeter.communes, ...defaultPerimeter.epcis].map(({ uuid, name, code }) => [
            uuid,
            `${name} (${code})`,
        ]),
    );

export const getInitialCriteriaFormState = (
    options: ControlPlanCriteriaOptions,
    criteria?: ControlPlanCriteria,
    parcelsCount?: number,
): CriteriaFormState => ({
    communesUuids: criteria?.communesUuids ?? options.defaultPerimeter.communes.map(({ uuid }) => uuid),
    epcisUuids: criteria?.epcisUuids ?? options.defaultPerimeter.epcis.map(({ uuid }) => uuid),
    objectTypesUuids: criteria
        ? toDisplayedObjectTypesUuids(options, criteria.objectTypesUuids)
        : options.objectTypes.filter(({ status }) => status === 'VISIBLE').map(({ uuid }) => uuid),
    scoreMin: criteria?.scoreMin ?? DEFAULT_SCORE_MIN,
    validationStatuses: criteria?.validationStatuses ?? [...controlPlanValidationStatuses],
    includePrescribed: criteria?.includePrescribed ?? false,
    zoneGroups: getZoneGroupRows(options, criteria),
    excludeAuthorizedParcels: criteria?.excludeAuthorizedParcels ?? true,
    excludeOfficialReportParcels: criteria?.excludeOfficialReportParcels ?? true,
    minObjectsCount: criteria?.minObjectsCount ?? 1,
    rankingCriteria: getRankingCriteriaRows(criteria),
    parcelsCount: parcelsCount ?? DEFAULT_PARCELS_COUNT,
});

export const validateCriteriaFormState = (state: CriteriaFormState): CriteriaFormErrors => {
    const errors: CriteriaFormErrors = {};

    if (!state.objectTypesUuids.length) {
        errors.objectTypesUuids = 'Sélectionnez au moins un type d’objet.';
    }
    if (!state.validationStatuses.length) {
        errors.validationStatuses = 'Sélectionnez au moins un état de conformité.';
    }
    if (!state.zoneGroups.some(({ selected }) => selected)) {
        errors.zoneGroups = 'Sélectionnez au moins une zone à enjeux.';
    }
    if (!Number.isInteger(state.minObjectsCount) || state.minObjectsCount < 1) {
        errors.minObjectsCount = 'Indiquez un nombre entier supérieur ou égal à 1.';
    }
    if (!Number.isInteger(state.parcelsCount) || state.parcelsCount < 1 || state.parcelsCount > MAX_PARCELS_COUNT) {
        errors.parcelsCount = `Indiquez un nombre entier entre 1 et ${MAX_PARCELS_COUNT}.`;
    }

    return errors;
};

export const criteriaFormStateToInput = (
    state: CriteriaFormState,
    options: ControlPlanCriteriaOptions,
): ControlPlanWaveInput => {
    const otherUuids = getOtherObjectTypesUuids(options);
    const objectTypesUuids = state.objectTypesUuids.flatMap((uuid) =>
        uuid === OTHER_OBJECT_TYPE.uuid ? otherUuids : [uuid],
    );

    return {
        parcelsCount: state.parcelsCount,
        criteria: {
            communesUuids: state.communesUuids,
            epcisUuids: state.epcisUuids,
            objectTypesUuids: Array.from(new Set(objectTypesUuids)),
            scoreMin: state.scoreMin,
            validationStatuses: state.validationStatuses,
            includePrescribed: state.includePrescribed,
            customZoneGroups: state.zoneGroups
                .filter(({ selected }) => selected)
                .map(({ customZoneUuids }) => customZoneUuids),
            excludeAuthorizedParcels: state.excludeAuthorizedParcels,
            excludeOfficialReportParcels: state.excludeOfficialReportParcels,
            minObjectsCount: state.minObjectsCount,
            rankingCriteria: state.rankingCriteria.filter(({ active }) => active).map(({ criterion }) => criterion),
        },
    };
};

// moves `item` to the place `target` holds, as the sortable lists report it
export const moveItem = <T>(items: T[], item: T, target: T): T[] => {
    const moved = [...items];
    moved.splice(items.indexOf(target), 0, ...moved.splice(items.indexOf(item), 1));
    return moved;
};

export const toggleZoneGroup = (zoneGroups: ZoneGroupRow[], key: string, selected: boolean): ZoneGroupRow[] =>
    zoneGroups.map((group) => (group.key === key ? { ...group, selected } : group));

// on the container of a field: the focus goes to its first control when it holds an error
export const CRITERIA_FIELD_ATTRIBUTE = 'data-criteria-field';

export const CRITERIA_FIELD_LABELS: Partial<Record<keyof CriteriaFormState, string>> = {
    zoneGroups: 'Zones à enjeux',
    objectTypesUuids: 'Types d’objets',
    parcelsCount: 'Nombre de parcelles',
    validationStatuses: 'États de conformité',
    minObjectsCount: 'Nombre minimum d’objets',
};

// The fields folded under « Critères avancés »: an error there has to unfold it.
export const ADVANCED_FIELDS: (keyof CriteriaFormState)[] = [
    'validationStatuses',
    'scoreMin',
    'includePrescribed',
    'excludeAuthorizedParcels',
    'excludeOfficialReportParcels',
    'minObjectsCount',
];

// In the order of the form: the first one gets the focus when the criteria are invalid.
export const CRITERIA_FIELDS_ORDER: (keyof CriteriaFormState)[] = [
    'zoneGroups',
    'objectTypesUuids',
    'rankingCriteria',
    'parcelsCount',
    ...ADVANCED_FIELDS,
];

export const isAdvancedDefault = (state: CriteriaFormState) =>
    state.validationStatuses.length === controlPlanValidationStatuses.length &&
    state.scoreMin === DEFAULT_SCORE_MIN &&
    !state.includePrescribed &&
    state.excludeAuthorizedParcels &&
    state.excludeOfficialReportParcels &&
    state.minObjectsCount === 1;

const describeExclusions = ({ excludeAuthorizedParcels, excludeOfficialReportParcels }: CriteriaFormState) => {
    if (excludeAuthorizedParcels && excludeOfficialReportParcels) {
        return 'hors parcelles avec autorisation ou PV';
    }
    if (excludeAuthorizedParcels) {
        return 'hors parcelles avec autorisation';
    }
    if (excludeOfficialReportParcels) {
        return 'hors parcelles avec PV';
    }
    return 'parcelles avec autorisation ou PV incluses';
};

/** One line for the folded advanced criteria, e.g. « Suspect et Non vérifié · score ≥ 30 · hors prescrits ». */
export const describeAdvancedCriteria = (state: CriteriaFormState) => {
    const statuses = controlPlanValidationStatuses
        .filter((status) => state.validationStatuses.includes(status))
        .reverse()
        .map((status) => DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]);

    return [
        statuses.length ? statuses.join(' et ') : 'aucun état de conformité',
        `score ≥ ${Math.round(state.scoreMin * 100)}`,
        state.includePrescribed ? 'prescrits inclus' : 'hors prescrits',
        describeExclusions(state),
        ...(state.minObjectsCount > 1 ? [`au moins ${state.minObjectsCount} objets par parcelle`] : []),
    ].join(' · ');
};

// « A, B et C », or « A, B, C et 2 autres » past `max`
export const formatList = (items: string[], max = 3) => {
    if (items.length > max) {
        const others = items.length - max;
        return `${items.slice(0, max).join(', ')} et ${others} ${others > 1 ? 'autres' : 'autre'}`;
    }

    return items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}` : items.join('');
};

export interface CriteriaSummary {
    perimeter: string;
    zones: string;
    objectTypes: string;
    filters: string;
    ranking: string;
}

/** What the agent asks for, in words: shown before generating and before validating. */
export const describeCriteria = (
    state: CriteriaFormState,
    options: ControlPlanCriteriaOptions,
    perimeterLabels: Record<string, string>,
): CriteriaSummary => {
    // the names without their INSEE / SIREN code
    const perimeterNames = [...state.epcisUuids, ...state.communesUuids]
        .map((uuid) => perimeterLabels[uuid]?.replace(/\s\([^)]*\)$/, ''))
        .filter((name): name is string => !!name);
    const unnamedCount = state.epcisUuids.length + state.communesUuids.length - perimeterNames.length;

    const displayedTypes = [
        ...options.objectTypes.filter(({ status }) => status !== 'OTHER_CATEGORY'),
        ...(options.objectTypes.some(({ status }) => status === 'OTHER_CATEGORY') ? [OTHER_OBJECT_TYPE] : []),
    ];
    const selectedTypes = displayedTypes.filter(({ uuid }) => state.objectTypesUuids.includes(uuid));

    const selectedZones = state.zoneGroups.filter(({ selected }) => selected);
    const activeCriteria = state.rankingCriteria.filter(({ active }) => active);

    let perimeter: string;
    if (options.singleCommune) {
        perimeter = options.singleCommune.name;
    } else if (perimeterNames.length || unnamedCount) {
        perimeter = formatList([
            ...perimeterNames,
            ...(unnamedCount ? [`${unnamedCount} ${unnamedCount > 1 ? 'collectivités' : 'collectivité'}`] : []),
        ]);
    } else {
        perimeter = 'Tout le territoire du groupe';
    }

    return {
        perimeter,
        zones: selectedZones.length ? formatList(selectedZones.map(({ name }) => name)) : 'Aucune zone',
        objectTypes:
            selectedTypes.length === displayedTypes.length
                ? 'Tous les types d’objets'
                : selectedTypes.length
                  ? formatList(
                        selectedTypes.map(({ name }) => name),
                        4,
                    )
                  : 'Aucun type',
        filters: describeAdvancedCriteria(state),
        ranking: activeCriteria.length
            ? activeCriteria
                  .map(({ criterion }, index) => {
                      const label = RANKING_CRITERIA_LABELS[criterion].label;
                      return index ? `puis ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
                  })
                  .join(', ')
            : 'Aucun critère : par commune puis par parcelle',
    };
};
