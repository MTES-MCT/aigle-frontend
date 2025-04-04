import { getDetectionListEndpoint } from '@/api-endpoints';
import FilterObjects from '@/components/FilterObjects';
import LayoutBase from '@/components/LayoutBase';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import PillsDataCell from '@/components/admin/data-cells/PillsDataCell';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { DetectionListItem } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { TileSet } from '@/models/tile-set';
import TableDownloadButton from '@/routes/Table/TableDownloadButton';
import TableHeader from '@/routes/Table/TableHeader';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP,
    DETECTION_SOURCE_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { useStatistics } from '@/utils/context/statistics-context';
import { formatParcel } from '@/utils/format';
import { Badge, Table } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import React from 'react';
import classes from './index.module.scss';

const ENDPOINT = getDetectionListEndpoint();

interface FormValues {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
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
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            communesUuids: [] as string[],
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });

    return (
        <div>
            <DataTable<DetectionListItem, DataTableFilter>
                endpoint={ENDPOINT}
                filter={{ ...objectsFilter, ...form.getValues() }}
                SoloAccordion={
                    <SoloAccordion opened>
                        <GeoCollectivitiesMultiSelects form={form} />

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
                    </div>
                }
                tableHeader={[
                    <Table.Th key="detectionObjectId">Object n°</Table.Th>,
                    <Table.Th key="address">Adresse</Table.Th>,
                    <Table.Th key="geoCustomZones">Zones à enjeux</Table.Th>,
                    <Table.Th key="objectTypeName">Type</Table.Th>,
                    <Table.Th key="tileSets">Millésime</Table.Th>,
                    <Table.Th key="parcel">Parcelle</Table.Th>,
                    <Table.Th key="score">Score</Table.Th>,
                    <Table.Th key="detectionSource">Source</Table.Th>,
                    <Table.Th key="detectionControlStatus">Statut de contrôle</Table.Th>,
                    <Table.Th key="detectionPrescriptionStatus">Prescription</Table.Th>,
                    <Table.Th key="detectionValidationStatus">Statut de validation</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: DetectionListItem) => item.detectionObjectId,
                    (item: DetectionListItem) => <OptionalText text={item.address} />,
                    (item: DetectionListItem) => (
                        <PillsDataCell<GeoCustomZone>
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
                        <PillsDataCell<TileSet> items={item.tileSets} getLabel={(tileSet) => tileSet.name} />
                    ),
                    (item: DetectionListItem) => (
                        <OptionalText text={item.parcel ? formatParcel(item.parcel, false) : null} />
                    ),
                    (item: DetectionListItem) => Math.round(item.score * 100),
                    (item: DetectionListItem) => <>{DETECTION_SOURCE_NAMES_MAP[item.detectionSource]}</>,
                    (item: DetectionListItem) => (
                        <>{DETECTION_CONTROL_STATUSES_NAMES_MAP[item.detectionControlStatus]}</>
                    ),
                    (item: DetectionListItem) => (
                        <>
                            {
                                DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP[
                                    item.detectionPrescriptionStatus || 'NOT_PRESCRIBED'
                                ]
                            }
                        </>
                    ),
                    (item: DetectionListItem) => (
                        <>{DETECTION_VALIDATION_STATUSES_NAMES_MAP[item.detectionValidationStatus]}</>
                    ),
                ]}
                initialLimit={50}
            />
        </div>
    );
};

const Component: React.FC = () => {
    const { objectsFilter, allObjectTypes, customZoneLayers, updateObjectsFilter, otherObjectTypesUuids } =
        useStatistics();

    if (!objectsFilter || !allObjectTypes || !customZoneLayers || !updateObjectsFilter || !otherObjectTypesUuids) {
        return (
            <LayoutBase>
                <Loader />
            </LayoutBase>
        );
    }

    return (
        <LayoutBase>
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
