import { detectionValidationStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import {
    DEFAULT_DETECTION_CONTROL_STATUSES,
    DEFAULT_DETECTION_VALIDATION_STATUSES,
    DEFAULT_PRESCRIPTED,
} from '@/utils/objects-filter';

// A preset only drives the workflow-related fields; object types, score and zones are left untouched.
type PresetFilter = Pick<ObjectsFilter, 'detectionValidationStatuses' | 'detectionControlStatuses' | 'prescripted'>;

export interface ObjectsFilterPreset {
    id: string;
    label: string;
    filter: PresetFilter;
}

export const CUSTOM_PRESET_ID = 'CUSTOM';
export const CUSTOM_PRESET_LABEL = 'Personnalisés';

export const OBJECTS_FILTER_PRESETS: ObjectsFilterPreset[] = [
    {
        id: 'DEFAULT',
        label: 'Par défaut',
        filter: {
            detectionValidationStatuses: DEFAULT_DETECTION_VALIDATION_STATUSES,
            detectionControlStatuses: DEFAULT_DETECTION_CONTROL_STATUSES,
            prescripted: DEFAULT_PRESCRIPTED,
        },
    },
    {
        id: 'VERIFY_AI_DETECTIONS',
        label: 'Vérifier les détections IA',
        filter: {
            detectionValidationStatuses: ['DETECTED_NOT_VERIFIED'],
            detectionControlStatuses: ['NOT_CONTROLLED'],
            prescripted: false,
        },
    },
    {
        id: 'PREPARE_VISITS',
        label: 'Préparer des visites',
        filter: {
            detectionValidationStatuses: ['SUSPECT'],
            detectionControlStatuses: ['NOT_CONTROLLED'],
            prescripted: null,
        },
    },
    {
        id: 'MANAGE_FIELD_CONTROLS',
        label: 'Gérer les contrôles terrain',
        filter: {
            detectionValidationStatuses: ['SUSPECT', 'ILLEGAL'],
            detectionControlStatuses: ['TO_CONTROL'],
            prescripted: null,
        },
    },
    {
        id: 'SEND_PRIOR_LETTERS',
        label: 'Envoyer des courriers préalables',
        filter: {
            detectionValidationStatuses: ['SUSPECT', 'ILLEGAL'],
            detectionControlStatuses: ['CONTROLLED_FIELD'],
            prescripted: null,
        },
    },
    {
        id: 'MANAGE_PROCEDURES',
        label: 'Gérer les procédures',
        filter: {
            detectionValidationStatuses: ['DETECTED_NOT_VERIFIED', 'SUSPECT', 'ILLEGAL'],
            detectionControlStatuses: [
                'PRIOR_LETTER_SENT',
                'OFFICIAL_REPORT_DRAWN_UP',
                'JUGEMENT',
                'ADMINISTRATIVE_CONSTRAINT',
                'OBSERVARTION_REPORT_REDACTED',
            ],
            prescripted: null,
        },
    },
    {
        id: 'REHABILITATED',
        label: 'Remis en état',
        filter: {
            detectionValidationStatuses: [...detectionValidationStatuses],
            detectionControlStatuses: ['REHABILITATED'],
            prescripted: null,
        },
    },
];

const haveSameValues = <T>(first: T[], second: T[]): boolean => {
    if (first.length !== second.length) {
        return false;
    }
    const secondValues = new Set(second);
    return first.every((value) => secondValues.has(value));
};

const filterMatchesPreset = (filter: ObjectsFilter, preset: PresetFilter): boolean =>
    filter.prescripted === preset.prescripted &&
    haveSameValues(filter.detectionValidationStatuses, preset.detectionValidationStatuses) &&
    haveSameValues(filter.detectionControlStatuses, preset.detectionControlStatuses);

export const getMatchingPresetId = (filter: ObjectsFilter): string | null =>
    OBJECTS_FILTER_PRESETS.find((preset) => filterMatchesPreset(filter, preset.filter))?.id ?? null;
