import { detectionEndpoints, parcelEndpoints } from '@/api/endpoints';
import { SortOrder } from '@/components/dsfr/Table';
import ToggleSwitch from '@/components/dsfr/ToggleSwitch';
import EditMultipleDetectionsModal from '@/components/EditMultipleDetectionsModal';
import FilterObjects from '@/components/FilterObjects';
import GeoCollectivitiesMultiSelects, {
    GeoCollectivitiesUserChange,
} from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import Header from '@/components/Header';
import LayoutBase from '@/components/LayoutBase';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import SidePanel, { SidePanelSection } from '@/components/SidePanel';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { ParcelListItem } from '@/models/parcel';
import DetectionsTable from '@/routes/Table/DetectionsTable';
import ParcelsTable, { ParcelsOrder, ParcelsSortField } from '@/routes/Table/ParcelsTable';
import TableDownloadButton from '@/routes/Table/TableDownloadButton';
import TableHeader from '@/routes/Table/TableHeader';
import { FormValues } from '@/routes/Table/utils';
import { useAuth } from '@/store/slices/auth';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { useStatistics } from '@/store/slices/statistics';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { getPageTitle } from '@/utils/html';
import { trackEvent } from '@/utils/matomo';
import { isObjectsFilterDefault } from '@/utils/objects-filter';
import { TRACKING_CATEGORIES, getFilterTrackingName } from '@/utils/tracking';
import { UseFormReturnType, useForm } from '@mantine/form';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

const getOrderParams = (
    order?: ParcelsOrder,
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

interface DataTableFilter extends ObjectsFilter, FormValues {}

// The DSFR info alert, closable for the visit as the former InfoCard was.
const SearchNotice: React.FC = () => {
    const [shown, setShown] = useState(true);

    if (!shown) {
        return null;
    }

    return (
        <div className={`fr-alert fr-alert--info fr-alert--sm ${classes['search-notice']}`}>
            <p>Vous devez sélectionner au moins une commune ou un EPCI pour afficher les parcelles.</p>
            <button
                type="button"
                className="fr-btn--close fr-btn"
                title="Masquer le message"
                onClick={() => setShown(false)}
            >
                Masquer le message
            </button>
        </div>
    );
};

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
    const [order, setOrder] = React.useState<ParcelsOrder | undefined>();
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

                    <SearchNotice />
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
                <TableHeader {...form.getValues()} />

                <div className={classes.toolbar}>
                    {canEditMultiple ? (
                        <ToggleSwitch
                            label="Edition multiple"
                            checked={selectionShowed}
                            onChange={(checked) => {
                                setSelectionShowed(checked);
                                if (checked) {
                                    trackEvent(TRACKING_CATEGORIES.bulkEdit, 'Mode activé', 'Tableau');
                                } else {
                                    setSelectedUuids([]);
                                }
                            }}
                        />
                    ) : (
                        <span />
                    )}
                    <TableDownloadButton {...form.getValues()} ordering={exportOrdering} />
                </div>

                <ParcelsTable<DataTableFilter>
                    endpoint={ENDPOINT}
                    filter={filter}
                    queryEnabled={form.getValues().communesUuids.length > 0 || form.getValues().epcisUuids.length > 0}
                    initialLimit={50}
                    order={order}
                    onOrderChange={(field: ParcelsSortField, sortOrder?: SortOrder) => {
                        setOrder(sortOrder ? { sortOrder, field } : undefined);
                        trackSort(field, sortOrder);
                    }}
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
                />

                {selectedUuids?.length ? (
                    <div className={classes['edit-selection']}>
                        <button
                            type="button"
                            className="fr-btn fr-icon-edit-line fr-btn--icon-left"
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
                        </button>
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
