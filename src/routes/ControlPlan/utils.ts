import { controlPlanEndpoints, controlPlanParcelEndpoints, detectionEndpoints, parcelEndpoints } from '@/api/endpoints';
import {
    ControlPlan,
    ControlPlanFollowUpStatus,
    ControlPlanInput,
    ControlPlanParcel,
    ControlPlanRankingCriterion,
} from '@/models/control-plan';
import { ApiError } from '@/utils/api';
import { DEFAULT_DATE_FORMAT } from '@/utils/constants';
import { formatBigInt, formatDateOnly } from '@/utils/format';
import { trackEvent } from '@/utils/matomo';
import { CONTROL_PLAN_PARAM, CONTROL_PLAN_UUID_PARAM } from '@/utils/objects-filter';
import { OBJECTS_FILTER_PRESETS } from '@/utils/objects-filter-presets';
import { getErrorTrackingName, isNetworkError, TRACKING_CATEGORIES } from '@/utils/tracking';
import { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

// Every plan query starts with it, so that one invalidation refreshes the page after a write.
export const CONTROL_PLAN_QUERY_KEY = controlPlanEndpoints.list;

/**
 * After a write on the plan. `detections`: the write changed control statuses (validation, removal,
 * closing), which the map and the table lists filter on.
 */
export const invalidateControlPlanQueries = async (queryClient: QueryClient, { detections = false } = {}) => {
    const keys = [CONTROL_PLAN_QUERY_KEY, controlPlanParcelEndpoints.list];

    if (detections) {
        keys.push(
            detectionEndpoints.getList(),
            detectionEndpoints.getList(false, true),
            parcelEndpoints.listItems,
            parcelEndpoints.overview,
        );
    }

    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
};

/**
 * The map under a quick filter of the Filtres panel, with « Uniquement mes plans de contrôle » if asked,
 * narrowed to one plan with `controlPlanUuid`.
 */
export const getMapLink = (
    presetId: string,
    { controlPlan = false, controlPlanUuid }: { controlPlan?: boolean; controlPlanUuid?: string } = {},
) => {
    const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === presetId);
    const params = new URLSearchParams(
        preset
            ? {
                  detectionValidationStatuses: preset.filter.detectionValidationStatuses.join(','),
                  detectionControlStatuses: preset.filter.detectionControlStatuses.join(','),
                  prescripted: String(preset.filter.prescripted),
              }
            : {},
    );
    if (controlPlan) {
        params.set(CONTROL_PLAN_PARAM, 'true');
        if (controlPlanUuid) {
            params.set(CONTROL_PLAN_UUID_PARAM, controlPlanUuid);
        }
    }

    return `/map?${params.toString()}`;
};

/** The Suivi page on the parcels of one plan, for a full page load (a new tab). */
export const getFollowUpPageLink = (controlPlanUuid: string) =>
    `/table?${new URLSearchParams({ [CONTROL_PLAN_PARAM]: 'true', [CONTROL_PLAN_UUID_PARAM]: controlPlanUuid }).toString()}`;

export const RANKING_CRITERIA_LABELS: Record<ControlPlanRankingCriterion, { label: string; hint: string }> = {
    OBJECTS_COUNT: {
        label: 'Nombre d’objets sur la parcelle',
        hint: 'les parcelles qui portent le plus d’objets passent devant',
    },
    NEW_OBJECTS_COUNT: {
        label: 'Nouveaux objets',
        hint: 'les parcelles où le dernier millésime fait apparaître le plus d’objets passent devant',
    },
    OBJECT_TYPE_PRIORITY: {
        label: 'Types d’objets prioritaires',
        hint: 'les parcelles qui portent le type d’objet le plus important passent devant, dans l’ordre choisi',
    },
    SMALL_PARCELS: {
        label: 'Petites parcelles',
        hint: 'les parcelles les plus petites passent devant, par tranche de surface (moins de 1\u00a0000\u00a0m², de 2\u00a0500\u00a0m², de 5\u00a0000\u00a0m², d’1\u00a0ha)',
    },
    PRESCRIPTION_SOON: {
        label: 'Prescription proche',
        hint: 'les parcelles dont un objet atteint sa prescription dans moins de 2\u00a0ans passent devant, la plus proche d’abord',
    },
};

// Why an estimated prescription is to be checked: shown with the criterion and with the dates it gives.
export const PRESCRIPTION_ESTIMATE_TITLE = 'Prescription estimée, à vérifier';
export const PRESCRIPTION_ESTIMATE_TEXT =
    'Aigle date un objet du premier millésime où il apparaît. Il a pu être construit plus tôt, depuis la prise de vue précédente\u00a0: sa prescription peut alors être plus proche, voire déjà acquise. Les objets déjà visibles sur le plus ancien millésime ne sont pas datés. Vérifiez la date de construction avant d’engager une procédure.';

/** « Prescription d’ici 06/2027 »: the estimate is the latest date the prescription can fall on. */
export const formatPrescriptionDate = (prescriptionDate: string) =>
    `Prescription d’ici ${formatDateOnly(prescriptionDate, 'MM/yyyy')}`;

export const FOLLOW_UP_LABELS: Record<ControlPlanFollowUpStatus, string> = {
    TO_CONTROL: 'À contrôler',
    CONTROLLED: 'Contrôlée',
    RELEASED: 'Sortie du plan',
};

// same hues as the control statuses
export const FOLLOW_UP_BADGE_CLASSES: Record<ControlPlanFollowUpStatus, string> = {
    TO_CONTROL: 'fr-badge--green-archipel',
    CONTROLLED: 'fr-badge--success',
    RELEASED: '',
};

export const getDefaultPlanInput = (): ControlPlanInput => {
    const year = new Date().getFullYear();

    return { name: `Plan de contrôle ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
};

export const formatPlanPeriod = ({ startDate, endDate }: Pick<ControlPlan, 'startDate' | 'endDate'>) =>
    endDate
        ? `du ${formatDateOnly(startDate)} au ${formatDateOnly(endDate)}`
        : `depuis le ${formatDateOnly(startDate)}, sans date de fin`;

/** Where a plan stands, in a few words. */
export const getPlanStatus = ({
    counters,
    validatedWavesCount,
    draftWave,
}: Pick<ControlPlan, 'counters' | 'validatedWavesCount' | 'draftWave'>) => {
    if (!validatedWavesCount) {
        return draftWave ? 'Proposition en préparation' : 'Aucune parcelle validée';
    }

    return `${formatCount(counters.toControl, 'parcelle reste', 'parcelles restent')} à contrôler sur ${formatBigInt(counters.planned)}`;
};

// The local day of a timestamp (UTC on the API): formatDateOnly would show the UTC day, wrong overseas.
export const formatTimestampDay = (isoDateTime: string) => format(new Date(isoDateTime), DEFAULT_DATE_FORMAT);

export const formatCount = (count: number, singular: string, plural: string = `${singular}s`) =>
    `${formatBigInt(count)} ${count > 1 ? plural : singular}`;

export const formatPlanParcel = ({
    prefix,
    section,
    numParcel,
}: Pick<ControlPlanParcel, 'prefix' | 'section' | 'numParcel'>) =>
    `${parseInt(prefix) ? `${prefix} ` : ''}${section} ${numParcel}`;

export const trackControlPlanEvent = (action: string, name?: string, value?: number) =>
    trackEvent(TRACKING_CATEGORIES.controlPlan, action, name, value);

export const trackControlPlanError = (action: string, error: unknown) =>
    trackControlPlanEvent('Action échouée', `${action} : ${getErrorTrackingName(error)}`);

const toMessages = (value: unknown): string[] => {
    if (typeof value === 'string') {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.flatMap(toMessages);
    }

    // nested serializer errors, e.g. `criteria.customZoneGroups`
    if (value && typeof value === 'object') {
        return Object.values(value).flatMap(toMessages);
    }

    return [];
};

/** What to tell the agent when a request fails: the API messages, or a fallback. */
export const getErrorMessages = (error: unknown, fallback: string): string[] => {
    if (isNetworkError(error)) {
        return ['Le serveur n’a pas pu être joint : vérifiez votre connexion, puis réessayez.'];
    }

    // a non-JSON body is a server error page, not a message for the agent
    const body = error instanceof ApiError && typeof error.body === 'object' ? error.body : undefined;
    const messages = toMessages(body);

    return messages.length ? Array.from(new Set(messages)) : [fallback];
};
