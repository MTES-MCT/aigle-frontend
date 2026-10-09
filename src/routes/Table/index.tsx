import { detectionEndpoints, parcelEndpoints } from '@/api/endpoints';
import PillsDataCell from '@/components/DataCells/PillsDataCell';
import DataTable from '@/components/DataTable';
import DataTableSortableHeaderColumn, { SortOrder } from '@/components/DataTable/DataTableSortableHeaderColumn';
import EditMultipleDetectionsModal from '@/components/EditMultipleDetectionsModal';
import FilterObjects from '@/components/FilterObjects';
import GeoCollectivitiesMultiSelects, {
    GeoCollectivitiesUserChange,
} from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import Header from '@/components/Header';
import LayoutBase from '@/components/LayoutBase';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import SidePanel, { SidePanelSection } from '@/components/SidePanel';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { ParcelListItem } from '@/models/parcel';
import DetectionCountCell from '@/routes/Table/DetectionCountCell';
import DetectionsTable from '@/routes/Table/DetectionsTable';
import TableDownloadButton from '@/routes/Table/TableDownloadButton';
import TableHeader from '@/routes/Table/TableHeader';
import { FormValues } from '@/routes/Table/utils';
import { useAuth } from '@/store/slices/auth';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { useStatistics } from '@/store/slices/statistics';
import { formatParcel } from '@/utils/format';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { getPageTitle } from '@/utils/html';
import { trackEvent } from '@/utils/matomo';
import { isObjectsFilterDefault } from '@/utils/objects-filter';
import { TRACKING_CATEGORIES, getFilterTrackingName } from '@/utils/tracking';
import { ActionIcon, Button, Switch, Table, Tooltip } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { IconChevronDown, IconEdit } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useRef } from 'react';
import classes from './index.module.scss';

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

type SidePanelSectionId = 'SEARCH' | 'FILTER';

const COLLECTIVITY_CHANGE_TRACKING_NAMES: Record<GeoCollectivitiesUserChange, string> = {
    added: 'ajout',
    removed: 'retrait',
    codesPasted: 'codes collés',
    codesRejected: 'codes ignorés',
};

const trackSort = (field: string, sortOrder?: SortOrder) =>
    trackEvent(TRACKING_CATEGORIES.table, 'Tri modifié', `${field} : ${sortOrder ?? 'aucun'}`);

interface FieldOrder {
    sortOrder?: SortOrder;
    field: string;
}

interface DataTableFilter extends ObjectsFilter, FormValues {}

interface ComponentInnerProps {
    allObjectTypes: ObjectType[];
    visibleObjectTypesUuids: Set<string>;
    objectsFilter: ObjectsFilter;
    mapGeoCustomZoneLayers: MapGeoCustomZoneLayer[];
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    otherObjectTypesUuids: Set<string>;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    allObjectTypes,
    visibleObjectTypesUuids,
    objectsFilter,
    mapGeoCustomZoneLayers,
    updateObjectsFilter,
    otherObjectTypesUuids,
}: ComponentInnerProps) => {
    const [selectedUuids, setSelectedUuids] = React.useState<string[]>([]);
    const [order, setOrder] = React.useState<FieldOrder | undefined>();
    const [selectionShowed, setSelectionShowed] = React.useState(false);
    const [editMultipleDetectionsModalShowed, setEditMultipleDetectionsModalShowed] = React.useState(false);
    // below 992px the panel covers the table, which has to show first
    const [sidePanelSection, setSidePanelSection] = React.useState<SidePanelSectionId | undefined>(() =>
        window.matchMedia('(max-width: 992px)').matches ? undefined : 'FILTER',
    );
    const { getAccessibleGeozones, userMe } = useAuth();
    // The API only applies a bulk edit with WRITE rights (a scoped SUPER_ADMIN gets them on its group).
    const canEditMultiple =
        userMe?.userRole === 'SUPER_ADMIN' ||
        !!userMe?.userUserGroups.some(({ userGroupRights }) => userGroupRights.includes('WRITE'));
    // Filter the last settled result set was for: refetches, pages and sorts of one filter count once.
    const lastSettledFilterKeyRef = useRef<string>();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            communesUuids: getAccessibleGeozones('COMMUNE').map((zone) => zone.uuid),
            // Seeded too: a group scoped to an EPCI holds no COMMUNE zone, so without
            // this its table would open permanently empty.
            epcisUuids: getAccessibleGeozones('EPCI').map((zone) => zone.uuid),
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });
    const queryClient = useQueryClient();
    const dataTableFilter: DataTableFilter = {
        ...objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids),
        ...form.getValues(),
    };
    const orderParams = getOrderParams(order);
    // The export lists detections: it can follow the parcel sort, but has no detections count to sort on (API 500).
    const exportOrdering = order?.field === 'parcel' ? orderParams.ordering : undefined;
    const filter = useMemo(() => ({ ...dataTableFilter, ...orderParams }), [objectsFilter, form.getValues(), order]);

    const sidePanelSections: SidePanelSection<SidePanelSectionId>[] = [
        {
            id: 'SEARCH',
            title: 'Recherche',
            icon: 'fr-icon-search-line',
            content: (
                <div className={classes.search}>
                    <GeoCollectivitiesMultiSelects
                        form={form}
                        initialGeoSelectedValues={{
                            commune: getAccessibleGeozones('COMMUNE').map((com) => geoZoneToGeoOption(com)),
                            epci: getAccessibleGeozones('EPCI').map((epci) => geoZoneToGeoOption(epci)),
                            region: [],
                            department: [],
                        }}
                        displayedCollectivityTypes={new Set(['epci', 'commune'])}
                        onUserChange={(collectivityType, change, count) =>
                            trackEvent(
                                TRACKING_CATEGORIES.table,
                                'Périmètre modifié',
                                `${collectivityType} : ${COLLECTIVITY_CHANGE_TRACKING_NAMES[change]}`,
                                count,
                            )
                        }
                    />

                    <InfoCard>
                        Vous devez sélectionner au moins une commune ou un EPCI pour afficher les parcelles.
                    </InfoCard>
                </div>
            ),
        },
        {
            id: 'FILTER',
            title: 'Filtres',
            icon: 'fr-icon-filter-line',
            indicator: !isObjectsFilterDefault(
                objectsFilter,
                Array.from(visibleObjectTypesUuids),
                mapGeoCustomZoneLayers.flatMap(({ customZoneUuids }) => customZoneUuids),
            ),
            content: (
                <FilterObjects
                    objectTypes={allObjectTypes}
                    objectsFilter={objectsFilter}
                    mapGeoCustomZoneLayers={mapGeoCustomZoneLayers}
                    updateObjectsFilter={updateObjectsFilter}
                    otherObjectTypesUuids={otherObjectTypesUuids}
                    trackingCategory={TRACKING_CATEGORIES.tableFilters}
                />
            ),
        },
    ];

    return (
        // the bulk edit button reads this to clear the side panel
        <div
            className={classes.page}
            style={{ '--table-side-panel-open': sidePanelSection ? 1 : 0 } as React.CSSProperties}
        >
            <SidePanel
                layout="column"
                sections={sidePanelSections}
                section={sidePanelSection}
                setSection={setSidePanelSection}
            />

            <div className={classes.content}>
                <DataTable<ParcelListItem, DataTableFilter>
                    endpoint={ENDPOINT}
                    filter={filter}
                    queryEnabled={form.getValues().communesUuids.length > 0 || form.getValues().epcisUuids.length > 0}
                    layout="auto"
                    tableContainerClassName={classes['table-container']}
                    onRowExpand={(_, rank) =>
                        trackEvent(TRACKING_CATEGORIES.table, 'Parcelle dépliée', undefined, rank)
                    }
                    onDataSettled={(items) => {
                        const filterKey = JSON.stringify(dataTableFilter);
                        if (filterKey === lastSettledFilterKeyRef.current) {
                            return;
                        }

                        lastSettledFilterKeyRef.current = filterKey;
                        if (!items.length) {
                            trackEvent(
                                TRACKING_CATEGORIES.tableFilters,
                                'Aucun résultat affiché',
                                getFilterTrackingName(objectsFilter),
                            );
                        }
                    }}
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
                    beforeTable={
                        <div>
                            <TableDownloadButton {...form.getValues()} ordering={exportOrdering} />
                            <TableHeader {...form.getValues()} />
                            {canEditMultiple ? (
                                <Switch
                                    mt="md"
                                    label="Edition multiple"
                                    checked={selectionShowed}
                                    onChange={(event) => {
                                        setSelectionShowed(event.currentTarget.checked);
                                        if (event.currentTarget.checked) {
                                            trackEvent(TRACKING_CATEGORIES.bulkEdit, 'Mode activé', 'Tableau');
                                        } else {
                                            setSelectedUuids([]);
                                        }
                                    }}
                                />
                            ) : null}
                        </div>
                    }
                    tableHeader={[
                        <Table.Th key="commune">Commune</Table.Th>,
                        <Table.Th key="geoCustomZones">Zones à enjeux</Table.Th>,
                        <DataTableSortableHeaderColumn
                            key="detectionsCount"
                            onOrderChange={(sortOrder?: SortOrder) => {
                                setOrder(sortOrder ? { sortOrder, field: 'detectionsCount' } : undefined);
                                trackSort('detectionsCount', sortOrder);
                            }}
                            sortOrder={order?.field === 'detectionsCount' ? order.sortOrder : undefined}
                        >
                            Nombre de détections
                        </DataTableSortableHeaderColumn>,
                        <DataTableSortableHeaderColumn
                            key="parcel"
                            onOrderChange={(sortOrder?: SortOrder) => {
                                setOrder(sortOrder ? { sortOrder, field: 'parcel' } : undefined);
                                trackSort('parcel', sortOrder);
                            }}
                            sortOrder={order?.field === 'parcel' ? order.sortOrder : undefined}
                        >
                            Parcelle
                        </DataTableSortableHeaderColumn>,
                        <Table.Th key="actions" />,
                    ]}
                    tableBodyRenderFns={[
                        (item: ParcelListItem) => <OptionalText text={`${item.commune.name} (${item.commune.code})`} />,
                        (item: ParcelListItem) => (
                            <PillsDataCell<string>
                                direction="column"
                                items={item.zoneNames}
                                getLabel={(zone) => zone}
                            />
                        ),
                        (item: ParcelListItem) => <DetectionCountCell parcel={item} />,
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
                    <div className={classes['edit-selection']}>
                        <Button
                            leftSection={<IconEdit />}
                            radius="xl"
                            onClick={() => {
                                if (editMultipleDetectionsModalShowed) {
                                    return;
                                }

                                setEditMultipleDetectionsModalShowed(true);
                                trackEvent(
                                    TRACKING_CATEGORIES.bulkEdit,
                                    'Formulaire ouvert',
                                    'Tableau',
                                    selectedUuids.length,
                                );
                            }}
                        >
                            Editer la sélection ({selectedUuids?.length})
                        </Button>
                    </div>
                ) : null}

                <EditMultipleDetectionsModal
                    isShowed={editMultipleDetectionsModalShowed}
                    hide={(dataUpdated?: boolean) => {
                        setEditMultipleDetectionsModalShowed(false);
                        setSelectedUuids([]);

                        if (dataUpdated) {
                            // DataTable keys start with their endpoint alone: one prefix per list, plus the header counts.
                            [ENDPOINT, detectionEndpoints.getList(), parcelEndpoints.overview].forEach((endpoint) =>
                                queryClient.invalidateQueries({ queryKey: [endpoint] }),
                            );
                        }
                    }}
                    detectionsUuids={selectedUuids}
                    trackingSource="Tableau"
                />
            </div>
        </div>
    );
};

const Component: React.FC = () => {
    const { allObjectTypes, visibleObjectTypesUuids, customZoneLayers, otherObjectTypesUuids } = useStatistics();
    const { objectsFilter, updateObjectsFilter } = useObjectsFilter();

    if (!objectsFilter || !allObjectTypes || !visibleObjectTypesUuids || !customZoneLayers || !otherObjectTypesUuids) {
        return (
            <LayoutBase title="Tableau">
                <Loader />
            </LayoutBase>
        );
    }

    return (
        <>
            <title>{getPageTitle('Tableau')}</title>
            <Header />
            <ComponentInner
                allObjectTypes={allObjectTypes}
                visibleObjectTypesUuids={visibleObjectTypesUuids}
                objectsFilter={objectsFilter}
                mapGeoCustomZoneLayers={customZoneLayers}
                updateObjectsFilter={updateObjectsFilter}
                otherObjectTypesUuids={otherObjectTypesUuids}
            />
        </>
    );
};

export default Component;
