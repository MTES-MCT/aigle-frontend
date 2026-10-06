import { DdtmActivityGranularity, DdtmActivitySummary } from '@/models/ddtm-activity';
import { trackEvent, trackEventOnce } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { GRANULARITY_OPTIONS } from './activity';

// Names never carry a group, department or EPCI name, nor a file name: the users CSV is named after its group.
const ACTIONS = {
    dashboardDisplayed: 'Tableau de bord affiché',
    exported: 'Export téléchargé',
    exportFailed: 'Export échoué',
    granularityChanged: 'Granularité modifiée',
    groupSelected: 'Groupe sélectionné',
    periodSelected: 'Période sélectionnée',
} as const;

const track = (action: string, name: string, value?: number) =>
    trackEvent(TRACKING_CATEGORIES.statistics, action, name, value);

const getGranularityLabel = (granularity: DdtmActivityGranularity) =>
    GRANULARITY_OPTIONS.find((option) => option.value === granularity)?.label ?? granularity;

export const trackDashboardDisplayed = (summary: DdtmActivitySummary) => {
    let name = summary.userGroups.length ? 'Mes groupes' : 'Aucun groupe';
    if (summary.departmentName !== null) {
        name = 'Département';
    } else if (summary.epciName !== null) {
        name = 'EPCI';
    }

    track(ACTIONS.dashboardDisplayed, name);
};

export const trackGranularityChanged = (granularity: DdtmActivityGranularity) =>
    track(ACTIONS.granularityChanged, getGranularityLabel(granularity));

export type GroupSelectionSource = 'Tableau des groupes' | 'Détail de la période' | 'Liste déroulante' | 'Mes groupes';

export const trackGroupSelected = (source: GroupSelectionSource) => track(ACTIONS.groupSelected, source);

// The distance from the latest period, not the period key: it means the same thing month after month.
export const trackPeriodSelected = (granularity: DdtmActivityGranularity, periodsBeforeLatest: number) =>
    track(ACTIONS.periodSelected, getGranularityLabel(granularity), periodsBeforeLatest);

export type CsvExport = 'Tableau des groupes' | 'Utilisateurs du groupe' | 'Détail de la période';

export const trackCsvExported = (table: CsvExport) => track(ACTIONS.exported, `CSV : ${table}`);

// `title` is the fixed chart title, never its file name or caption (both hold the group name).
export const trackChartPngExported = (title: string) => track(ACTIONS.exported, `Graphique PNG : ${title}`);

export const trackChartPngExportFailed = (title: string) =>
    trackEventOnce(TRACKING_CATEGORIES.statistics, ACTIONS.exportFailed, `Graphique PNG : ${title}`);

export interface ReportExportContent {
    overview: boolean;
    group: boolean;
    period: boolean;
}

const getReportExportName = ({ overview, group, period }: ReportExportContent): string => {
    if (overview) {
        return ['vue d’ensemble', ...(group ? ['groupe'] : []), ...(period ? ['période'] : [])].join(' + ');
    }

    // Downloaded before the dashboard had loaded, or by a user without any group.
    return group ? 'groupe' : 'vide';
};

export const trackReportExported = (content: ReportExportContent, generationSeconds: number) =>
    track(ACTIONS.exported, `Rapport PDF : ${getReportExportName(content)}`, generationSeconds);

export const trackReportExportFailed = () =>
    trackEventOnce(TRACKING_CATEGORIES.statistics, ACTIONS.exportFailed, 'Rapport PDF');

export const trackReportChartsMissing = (missingCount: number) =>
    trackEventOnce(
        TRACKING_CATEGORIES.statistics,
        ACTIONS.exportFailed,
        'Rapport PDF : graphique manquant',
        missingCount,
    );
