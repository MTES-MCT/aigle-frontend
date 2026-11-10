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

export const RANKING_CRITERIA_LABELS: Record<ControlPlanRankingCriterion, { label: string; hint: string }> = {
    ZONE_PRIORITY: {
        label: 'Zone à enjeux prioritaire',
        hint: 'les parcelles des zones classées en tête passent devant',
    },
    OBJECTS_COUNT: {
        label: 'Nombre d’objets sur la parcelle',
        hint: 'les parcelles qui portent le plus d’objets passent devant',
    },
    NEW_OBJECTS_COUNT: {
        label: 'Nouveaux objets',
        hint: 'les parcelles où le dernier millésime fait apparaître le plus d’objets passent devant',
    },
};

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
    `du ${formatDateOnly(startDate)} au ${formatDateOnly(endDate)}`;

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
