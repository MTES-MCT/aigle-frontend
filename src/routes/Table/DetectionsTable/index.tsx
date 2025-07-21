import { detectionEndpoints } from '@/api/endpoints';
import PillsDataCell from '@/components/DataCells/PillsDataCell';
import DataTable from '@/components/DataTable';
import DataTableSortableHeaderColumn, { SortOrder } from '@/components/DataTable/DataTableSortableHeaderColumn';
import OptionalText from '@/components/ui/OptionalText';
import { DetectionListItem } from '@/models/detection';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { TileSet } from '@/models/tile-set';
import { DataTableFilter } from '@/routes/Table/utils';
import {
    DETECTION_CONTROL_STATUSES_COLORS_MAP,
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_PRESCRIPTION_STATUSES_COLORS_MAP,
    DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_COLORS_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { getDetectionObjectLink } from '@/utils/link';
import { Badge, Button, Table } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import React from 'react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

const ENDPOINT = detectionEndpoints.getList();

interface FieldOrder {
    sortOrder?: SortOrder;
    field: string;
}

interface ParcelDataTableFilter extends DataTableFilter {
    parcelsUuids: string[];
}

interface ComponentProps {
    parcelUuid: string;
    dataTableFilter: DataTableFilter;
    selectionShowed: boolean;
    selectedUuids: string[];
    setSelectedUuids: React.Dispatch<React.SetStateAction<string[]>>;
}

const Component: React.FC<ComponentProps> = ({
    parcelUuid,
    dataTableFilter,
    selectionShowed,
    selectedUuids,
    setSelectedUuids,
}: ComponentProps) => {
    const [order, setOrder] = React.useState<FieldOrder | undefined>();

    return (
        <div className={classes.container}>
            <DataTable<DetectionListItem, ParcelDataTableFilter>
                endpoint={ENDPOINT}
                paginated={false}
                tableContainerClassName={classes['table-container']}
                filter={{
                    ...dataTableFilter,
                    parcelsUuids: [parcelUuid],
                }}
                showSelection={selectionShowed}
                showRefresh={false}
                selectedUuids={selectedUuids}
                setSelectedUuids={setSelectedUuids}
                layout="auto"
                striped={false}
                tableHeader={[
                    <Table.Th key="detectionObjectId">Object n°</Table.Th>,
                    <Table.Th key="commune">Commune</Table.Th>,
                    <Table.Th key="geoCustomZones">Zones à enjeux</Table.Th>,
                    <Table.Th key="objectTypeName">Type</Table.Th>,
                    <Table.Th key="tileSets">Millésime</Table.Th>,
                    <DataTableSortableHeaderColumn
                        key="detectionControlStatus"
                        onOrderChange={(sortOrder?: SortOrder) =>
                            setOrder(sortOrder ? { sortOrder, field: 'detectionControlStatus' } : undefined)
                        }
                        sortOrder={order?.field === 'detectionControlStatus' ? order.sortOrder : undefined}
                    >
                        Statut de contrôle
                    </DataTableSortableHeaderColumn>,
                    <Table.Th key="detectionPrescriptionStatus">Prescription</Table.Th>,
                    <Table.Th key="detectionValidationStatus">Statut de validation</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: DetectionListItem) => (
                        <Button
                            component={Link}
                            target="_blank"
                            variant="light"
                            size="compact-xs"
                            leftSection={<IconExternalLink size={14} />}
                            to={getDetectionObjectLink(item.detectionObjectUuid)}
                        >
                            {item.detectionObjectId}
                        </Button>
                    ),
                    (item: DetectionListItem) => <OptionalText text={`${item.communeName} (${item.communeIsoCode})`} />,
                    (item: DetectionListItem) => (
                        <PillsDataCell<GeoCustomZone>
                            direction="column"
                            items={item.geoCustomZones}
                            getLabel={(zone) => zone.geoCustomZoneCategory?.name || zone.name}
                        />
                    ),
                    (item: DetectionListItem) => (
                        <div className={classes['object-type-cell']}>
                            <Badge
                                className={classes['object-type-cell-badge']}
                                color={item.objectType.color}
                                radius={100}
                            />
                            {item.objectType.name}
                        </div>
                    ),
                    (item: DetectionListItem) => (
                        <PillsDataCell<TileSet>
                            direction="column"
                            items={item.tileSets}
                            getLabel={(tileSet) => tileSet.name}
                        />
                    ),
                    (item: DetectionListItem) => (
                        <Badge color={DETECTION_CONTROL_STATUSES_COLORS_MAP[item.detectionControlStatus]}>
                            {DETECTION_CONTROL_STATUSES_NAMES_MAP[item.detectionControlStatus]}
                        </Badge>
                    ),
                    (item: DetectionListItem) => (
                        <Badge color={DETECTION_PRESCRIPTION_STATUSES_COLORS_MAP[item.detectionPrescriptionStatus]}>
                            {
                                DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP[
                                    item.detectionPrescriptionStatus || 'NOT_PRESCRIBED'
                                ]
                            }
                        </Badge>
                    ),
                    (item: DetectionListItem) => (
                        <Badge color={DETECTION_VALIDATION_STATUSES_COLORS_MAP[item.detectionValidationStatus]}>
                            {DETECTION_VALIDATION_STATUSES_NAMES_MAP[item.detectionValidationStatus]}
                        </Badge>
                    ),
                ]}
            />
        </div>
    );
};

export default Component;
