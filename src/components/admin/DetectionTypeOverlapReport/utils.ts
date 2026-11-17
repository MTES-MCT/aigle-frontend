import { DetectionTypeOverlapReport } from '@/models/detection-type-overlap-report';
import { formatDateOnly } from '@/utils/format';

const RATE_FORMATTER = new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const formatOverlapRate = (count: number, total: number) => (total ? RATE_FORMATTER.format(count / total) : '—');

export const formatReportTileSets = (report: DetectionTypeOverlapReport) =>
    report.tileSets.map((tileSet) => formatDateOnly(tileSet.date, 'yyyy')).join(', ');
