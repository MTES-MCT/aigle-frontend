import {
    DdtmActivityGranularity,
    DdtmActivityGroupTiers,
    DdtmActivityPeriodTier,
    UserActivityStatus,
} from '@/models/ddtm-activity';
import { DetectionControlStatus } from '@/models/detection';
import { DETECTION_CONTROL_STATUSES_NAMES_MAP } from '@/utils/constants';

export const NOT_DEPLOYED_MESSAGE = 'Groupe non déployé à cette période';
export const NO_GROUP_DEPLOYED_MESSAGE = 'Aucun groupe déployé à cette période';

/** One series of a chart — what the bars, the legend and the tooltip all read from. */
export interface ChartSeriesItem {
    name: string;
    label: string;
    color: string;
}

const MONTH_LABELS = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
];

/**
 * Period key -> label. "2026-07" -> "juil. 2026", "2026-Q3" -> "T3 2026", "2026-S2" ->
 * "S2 2026". Pure string manipulation, so it is timezone-proof.
 */
export const formatPeriod = (key: string): string => {
    const [year, part] = key.split('-');

    if (part.startsWith('Q')) {
        return `T${part.slice(1)} ${year}`;
    }

    if (part.startsWith('S')) {
        return `S${part.slice(1)} ${year}`;
    }

    return `${MONTH_LABELS[Number(part) - 1]} ${year}`;
};

/** Labels of the periods entirely before deployment — nothing to break down there. */
export const buildNoDataLabels = (noDataUntilPeriod: string | null, periodKeys: string[]) =>
    noDataUntilPeriod === null
        ? new Set<string>()
        : new Set(periodKeys.filter((key) => key <= noDataUntilPeriod).map(formatPeriod));

// The four tiers are a rank, not four unrelated categories, so they take a single-hue ramp
// (darkest = most engaged) and the reader sees the ladder in the color itself. Grey is kept
// out of the ramp for "inactif": no activity is the absence of a rung, not the lowest one.
export const ACTIVITY_TIERS: Record<UserActivityStatus, { label: string; color: string; description: string }> = {
    PILOT: { label: 'Pilote', color: 'blue.9', description: 'au moins 7 actions opérationnelles' },
    RECURRENT: { label: 'Récurrent', color: 'blue.6', description: 'au moins 4 actions opérationnelles' },
    ACTIVE: { label: 'Actif', color: 'blue.4', description: 'au moins 1 connexion ou 1 action sur la période' },
    INACTIVE: { label: 'Inactif', color: 'gray.5', description: 'aucune action et aucune connexion' },
};

/** Most to least engaged: stacking order, legend order, sort order and section order. */
export const ACTIVITY_TIER_ORDER: UserActivityStatus[] = ['PILOT', 'RECURRENT', 'ACTIVE', 'INACTIVE'];

const ACTIVITY_TIER_DATA_KEYS: Record<UserActivityStatus, keyof DdtmActivityPeriodTier> = {
    PILOT: 'pilotCount',
    RECURRENT: 'recurrentCount',
    ACTIVE: 'activeCount',
    INACTIVE: 'inactiveCount',
};

/** The chart series a tier drives — how the legend and the detail sections stay in step. */
export const tierSeriesName = (tier: UserActivityStatus) => ACTIVITY_TIER_DATA_KEYS[tier];

/** Bottom-to-top: pilots, recurrents, actives, inactives. */
export const ACTIVITY_CHART_SERIES: ChartSeriesItem[] = ACTIVITY_TIER_ORDER.map((tier) => ({
    name: ACTIVITY_TIER_DATA_KEYS[tier],
    label: ACTIVITY_TIERS[tier].label,
    color: ACTIVITY_TIERS[tier].color,
}));

/**
 * 'blue.9' -> 'var(--mantine-color-blue-9)', so a swatch in CSS cannot drift from the bar it
 * names. A raw hex — the control statuses use those — passes through untouched.
 */
export const mantineCssColor = (color: string) =>
    /^[a-z]+\.\d$/.test(color) ? `var(--mantine-color-${color.replace('.', '-')})` : color;

export const tierCssColor = (tier: UserActivityStatus) => mantineCssColor(ACTIVITY_TIERS[tier].color);

/** Stable stacking order for the control-status chart, following the shared names map. */
export const CONTROL_STATUS_ORDER = Object.keys(DETECTION_CONTROL_STATUSES_NAMES_MAP) as DetectionControlStatus[];

export const GRANULARITY_OPTIONS: { label: string; value: DdtmActivityGranularity }[] = [
    { label: 'Mensuel', value: 'MONTH' },
    { label: 'Trimestriel', value: 'QUARTER' },
    { label: 'Semestriel', value: 'SEMESTER' },
];

/**
 * The groups of one period, bucketed by tier — the segments of the clicked column, named.
 * A group with no entry for that period is in none of them: it did not exist yet.
 */
export const groupsByTier = (groups: DdtmActivityGroupTiers[], period: string) =>
    ACTIVITY_TIER_ORDER.map((tier) => ({
        tier,
        groups: groups
            .filter((group) => group.tierByPeriod[period] === tier)
            .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }));

export const sumBy = <T>(items: T[], getValue: (item: T) => number) =>
    items.reduce((total, item) => total + getValue(item), 0);
