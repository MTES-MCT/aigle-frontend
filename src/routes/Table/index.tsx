import { parcelEndpoints } from '@/api/endpoints';
import PillsDataCell from '@/components/DataCells/PillsDataCell';
import DataTable from '@/components/DataTable';
import DataTableSortableHeaderColumn, { SortOrder } from '@/components/DataTable/DataTableSortableHeaderColumn';
import EditMultipleDetectionsModal from '@/components/EditMultipleDetectionsModal';
import FilterObjects from '@/components/FilterObjects';
import GeoCollectivitiesMultiSelects from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import LayoutBase from '@/components/LayoutBase';
import SoloAccordion from '@/components/SoloAccordion';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { ParcelListItem } from '@/models/parcel';
import DetectionsTable from '@/routes/Table/DetectionsTable';
import TableDownloadButton from '@/routes/Table/TableDownloadButton';
import TableHeader from '@/routes/Table/TableHeader';
import { FormValues } from '@/routes/Table/utils';
import { useStatistics } from '@/store/slices/statistics';
import { useAuth } from '@/utils/auth-context';
import { formatParcel } from '@/utils/format';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { ActionIcon, Affix, Button, Switch, Table, Tooltip } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { IconChevronDown, IconEdit } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

const getOrderParams = (
    order?: FieldOrder,
): {
    ordering?: string;
} => {
    if (!order) {
        return {};
    }
    return {
        ordering: order.sortOrder === 'asc' ? order.field : `-${order.field}`,
    };
};

const ENDPOINT = parcelEndpoints.listItems;

interface FieldOrder {
    sortOrder?: SortOrder;
    field: string;
}

interface DataTableFilter extends ObjectsFilter, FormValues {}

interface ComponentInnerProps {
    allObjectTypes: ObjectType[];
    objectsFilter: ObjectsFilter;
    mapGeoCustomZoneLayers: MapGeoCustomZoneLayer[];
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    otherObjectTypesUuids: Set<string>;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    allObjectTypes,
    objectsFilter,
    mapGeoCustomZoneLayers,
    updateObjectsFilter,
    otherObjectTypesUuids,
}: ComponentInnerProps) => {
    const [selectedUuids, setSelectedUuids] = React.useState<string[]>([]);
    const [order, setOrder] = React.useState<FieldOrder | undefined>();
    const [selectionShowed, setSelectionShowed] = React.useState(false);
    const [editMultipleDetectionsModalShowed, setEditMultipleDetectionsModalShowed] = React.useState(false);
    const { getAccessibleGeozones } = useAuth();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            communesUuids: getAccessibleGeozones('COMMUNE').map((zone) => zone.uuid),
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });
    const queryClient = useQueryClient();
    const dataTableFilter: DataTableFilter = { ...objectsFilter, ...form.getValues() };
    const filter = useMemo(
        () => ({ ...dataTableFilter, ...getOrderParams(order) }),
        [objectsFilter, form.getValues(), order],
    );

    return (
        <div>
            <DataTable<ParcelListItem, DataTableFilter>
                endpoint={ENDPOINT}
                filter={filter}
                queryEnabled={form.getValues().communesUuids.length > 0}
                layout="auto"
                getExpandedContent={(item: ParcelListItem) => (
                    <DetectionsTable
                        parcelUuid={item.uuid}
                        dataTableFilter={dataTableFilter}
                        selectionShowed={selectionShowed}
                        selectedUuids={selectedUuids}
                        setSelectedUuids={setSelectedUuids}
                    />
                )}
                striped={false}
                highlightOnHover={false}
                SoloAccordion={
                    <SoloAccordion opened>
                        <GeoCollectivitiesMultiSelects
                            form={form}
                            initialGeoSelectedValues={{
                                commune: getAccessibleGeozones('COMMUNE').map((com) => geoZoneToGeoOption(com)),
                                region: [],
                                department: [],
                            }}
                            displayedCollectivityTypes={new Set(['commune'])}
                        />

                        <InfoCard>Vous devez sélectionner au moins une commune pour afficher les parcelles.</InfoCard>

                        <FilterObjects
                            objectTypes={allObjectTypes}
                            objectsFilter={objectsFilter}
                            mapGeoCustomZoneLayers={mapGeoCustomZoneLayers}
                            updateObjectsFilter={updateObjectsFilter}
                            otherObjectTypesUuids={otherObjectTypesUuids}
                        />
                    </SoloAccordion>
                }
                beforeTable={
                    <div>
                        <TableDownloadButton {...form.getValues()} />
                        <TableHeader {...form.getValues()} />
                        <Switch
                            mt="md"
                            label="Edition multiple"
                            checked={selectionShowed}
                            onChange={(event) => {
                                setSelectionShowed(event.currentTarget.checked);
                                if (!event.currentTarget.checked) {
                                    setSelectedUuids([]);
                                }
                            }}
                        />
                    </div>
                }
                tableHeader={[
                    <Table.Th key="commune">Commune</Table.Th>,
                    <Table.Th key="geoCustomZones">Zones à enjeux</Table.Th>,
                    <DataTableSortableHeaderColumn
                        key="detectionsCount"
                        onOrderChange={(sortOrder?: SortOrder) =>
                            setOrder(sortOrder ? { sortOrder, field: 'detectionsCount' } : undefined)
                        }
                        sortOrder={order?.field === 'detectionsCount' ? order.sortOrder : undefined}
                    >
                        Nombre de détections
                    </DataTableSortableHeaderColumn>,
                    <DataTableSortableHeaderColumn
                        key="parcel"
                        onOrderChange={(sortOrder?: SortOrder) =>
                            setOrder(sortOrder ? { sortOrder, field: 'parcel' } : undefined)
                        }
                        sortOrder={order?.field === 'parcel' ? order.sortOrder : undefined}
                    >
                        Parcelle
                    </DataTableSortableHeaderColumn>,
                    <Table.Th key="actions" />,
                ]}
                tableBodyRenderFns={[
                    (item: ParcelListItem) => <OptionalText text={`${item.commune.name} (${item.commune.code})`} />,
                    (item: ParcelListItem) => (
                        <PillsDataCell<string> direction="column" items={item.zoneNames} getLabel={(zone) => zone} />
                    ),
                    (item: ParcelListItem) => item.detectionsCount,
                    (item: ParcelListItem) => (
                        <OptionalText
                            text={
                                <Tooltip label={item.idParcellaire}>
                                    <span>{formatParcel(item, false)}</span>
                                </Tooltip>
                            }
                        />
                    ),
                    () => (
                        <Tooltip label="Afficher les détections associées à cette parcelle">
                            <ActionIcon variant="subtle">
                                <IconChevronDown size={16} />
                            </ActionIcon>
                        </Tooltip>
                    ),
                ]}
                initialLimit={50}
            />

            {selectedUuids?.length ? (
                <Affix position={{ bottom: 16, left: 16 }}>
                    <Button
                        leftSection={<IconEdit />}
                        radius="xl"
                        onClick={() => setEditMultipleDetectionsModalShowed(true)}
                    >
                        Editer la sélection ({selectedUuids?.length})
                    </Button>
                </Affix>
            ) : null}

            <EditMultipleDetectionsModal
                isShowed={editMultipleDetectionsModalShowed}
                hide={(dataUpdated?: boolean) => {
                    setEditMultipleDetectionsModalShowed(false);
                    setSelectedUuids([]);

                    if (dataUpdated) {
                        // Invalidate the query to refresh the data
                        queryClient.invalidateQueries({ queryKey: [ENDPOINT] });
                    }
                }}
                detectionsUuids={selectedUuids}
            />
        </div>
    );
};

const Component: React.FC = () => {
    const { objectsFilter, allObjectTypes, customZoneLayers, updateObjectsFilter, otherObjectTypesUuids } =
        useStatistics();

    if (!objectsFilter || !allObjectTypes || !customZoneLayers || !updateObjectsFilter || !otherObjectTypesUuids) {
        return (
            <LayoutBase title="Tableau">
                <Loader />
            </LayoutBase>
        );
    }

    return (
        <LayoutBase title="Tableau">
            <ComponentInner
                allObjectTypes={allObjectTypes}
                objectsFilter={objectsFilter}
                mapGeoCustomZoneLayers={customZoneLayers}
                updateObjectsFilter={updateObjectsFilter}
                otherObjectTypesUuids={otherObjectTypesUuids}
            />
        </LayoutBase>
    );
};

export default Component;
