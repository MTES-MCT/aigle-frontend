import { DdtmActivityGranularity } from '@/models/ddtm-activity';
import { createContext, useContext, useEffect } from 'react';

/**
 * What the report generator cannot read from the query cache on its own: the selections
 * that live in the dashboards' local state. Published into a ref, never into state, so a
 * dashboard announcing itself never triggers a render.
 */
export interface ReportScope {
    caption: string;
    granularity: DdtmActivityGranularity;
    selectedGroupUuid: string | null;
    periodBreakdown: { period: string; tiersByLabel: { label: string; color: string; names: string[] }[] } | null;
}

export const ReportScopeContext = createContext<(scope: Partial<ReportScope>) => void>(() => {});

export const usePublishReportScope = (scope: Partial<ReportScope>) => {
    const publish = useContext(ReportScopeContext);

    // `scope` is rebuilt every render, but `publish` only writes a ref — no render loop.
    useEffect(() => {
        publish(scope);
    });
};

/** Marks the chart of a `ChartSection` so the generator can rasterise it, titled, in order. */
export const REPORT_CHART_ATTRIBUTE = 'data-report-chart';

/** Marks the subtree whose charts belong to the "one group in detail" part of the report. */
export const REPORT_GROUP_SECTION_ATTRIBUTE = 'data-report-group-section';
