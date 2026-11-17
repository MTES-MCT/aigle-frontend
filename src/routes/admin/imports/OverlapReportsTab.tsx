import React from 'react';

import { detectionTypeOverlapReportEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import DetectionTypeOverlapReportTable from '@/components/admin/DetectionTypeOverlapReport';
import { formatOverlapRate, formatReportTileSets } from '@/components/admin/DetectionTypeOverlapReport/utils';
import SortableTh from '@/components/admin/SortableTh';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DetectionTypeOverlapReport } from '@/models/detection-type-overlap-report';
import { CollectivityType } from '@/models/geo/_common';
import { COLLECTIVITY_TYPES_NAMES_MAP } from '@/utils/constants';
import { formatBigInt } from '@/utils/format';
import { ActionIcon, Anchor, Stack, Table, Tooltip } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { SearchInput } from './shared';

interface DataFilter {
    q: string;
    // the API `ordering`, '' = most recent report first
    ordering: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    ordering: '',
};

// reports are only computed for deployed zones: department, epci or commune
const getCollectivityType = (report: DetectionTypeOverlapReport) =>
    report.geoZone.geoZoneType.toLowerCase() as CollectivityType;

const ExpandedContent: React.FC<{ report: DetectionTypeOverlapReport }> = ({ report }) => (
    <Stack gap="sm" py="md">
        <DetectionTypeOverlapReportTable report={report} />
        <Anchor component={Link} to={`/admin/collectivites/${getCollectivityType(report)}/form/${report.geoZone.uuid}`}>
            Voir la collectivité
        </Anchor>
    </Stack>
);

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);
    const sortProps = {
        ordering: filter.ordering,
        onChange: (ordering: string) => setFilter((filter) => ({ ...filter, ordering })),
    };

    return (
        <DataTable<DetectionTypeOverlapReport, DataFilter>
            endpoint={detectionTypeOverlapReportEndpoints.list}
            filter={filter}
            striped={false}
            highlightOnHover={false}
            layout="auto"
            SoloAccordion={
                <SoloAccordion indicatorShown={!!filter.q}>
                    <SearchInput
                        placeholder="Rechercher une collectivité…"
                        matches={['nom de la collectivité']}
                        value={filter.q}
                        onChange={(q) => setFilter((filter) => ({ ...filter, q }))}
                    />
                </SoloAccordion>
            }
            tableHeader={[
                <SortableTh key="geoZone" field="geoZoneName" firstOrder="asc" {...sortProps}>
                    Collectivité
                </SortableTh>,
                <Table.Th key="type">Type</Table.Th>,
                <SortableTh key="year" field="year" {...sortProps}>
                    Millésime
                </SortableTh>,
                <SortableTh key="reportDate" field="reportDate" {...sortProps}>
                    Date du rapport
                </SortableTh>,
                <SortableTh key="detections" field="detectionsCount" {...sortProps}>
                    Détections
                </SortableTh>,
                <SortableTh key="overlapping" field="overlappingRate" {...sortProps}>
                    Superposées à un autre type
                </SortableTh>,
                <SortableTh key="prescribable" field="overlappingPrescribableRate" {...sortProps}>
                    … dont l&apos;un est prescriptible
                </SortableTh>,
                <Table.Th key="actions" />,
            ]}
            tableBodyRenderFns={[
                (item: DetectionTypeOverlapReport) =>
                    item.geoZone.code ? `${item.geoZone.name} (${item.geoZone.code})` : item.geoZone.name,
                (item: DetectionTypeOverlapReport) => COLLECTIVITY_TYPES_NAMES_MAP[getCollectivityType(item)] ?? '—',
                (item: DetectionTypeOverlapReport) => formatReportTileSets(item),
                (item: DetectionTypeOverlapReport) => <DateInfo date={item.reportDate} />,
                (item: DetectionTypeOverlapReport) => formatBigInt(item.detectionsCount),
                (item: DetectionTypeOverlapReport) => formatOverlapRate(item.overlappingCount, item.detectionsCount),
                (item: DetectionTypeOverlapReport) =>
                    formatOverlapRate(item.overlappingPrescribableCount, item.detectionsCount),
                () => (
                    <Tooltip label="Afficher le rapport">
                        <ActionIcon variant="subtle">
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Tooltip>
                ),
            ]}
            getExpandedContent={(item: DetectionTypeOverlapReport) => <ExpandedContent report={item} />}
        />
    );
};

export default Component;
