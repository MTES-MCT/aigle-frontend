import { getDetectionListEndpoint } from '@/api-endpoints';
import FilterObjects from '@/components/FilterObjects';
import LayoutBase from '@/components/LayoutBase';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import Loader from '@/components/ui/Loader';
import { DetectionDetail } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectType } from '@/models/object-type';
import { useAuth } from '@/utils/auth-context';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP,
    DETECTION_SOURCE_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { useStatistics } from '@/utils/context/statistics-context';
import { Table } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import React, { useMemo } from 'react';
import classes from './index.module.scss';

const ENDPOINT = getDetectionListEndpoint(true);

interface FormValues {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

interface DataTableFilter extends ObjectsFilter, FormValues {}

interface ComponentInnerProps {
    allObjectTypes: ObjectType[];
    objectsFilter: ObjectsFilter;
    geoCustomZones: GeoCustomZone[];
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    allObjectTypes,
    objectsFilter,
    geoCustomZones,
    updateObjectsFilter,
}: ComponentInnerProps) => {
    const { getUserGroupType, userMe } = useAuth();
    const userGroupType = useMemo(() => getUserGroupType(), [userMe]);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            communesUuids: [] as string[],
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });

    return (
        <>
            <DataTable<DetectionDetail, DataTableFilter>
                endpoint={ENDPOINT}
                filter={{ ...objectsFilter, ...form.getValues() }}
                SoloAccordion={
                    <SoloAccordion opened>
                        <GeoCollectivitiesMultiSelects form={form} className={classes['geocolectivities-container']} />

                        <FilterObjects
                            objectTypes={allObjectTypes}
                            objectsFilter={objectsFilter}
                            geoCustomZones={geoCustomZones}
                            updateObjectsFilter={updateObjectsFilter}
                        />
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="detectionObjectId">Object id</Table.Th>,
                    <Table.Th key="objectTypeName">Type</Table.Th>,
                    <Table.Th key="score">Score</Table.Th>,
                    <Table.Th key="detectionSource">Source</Table.Th>,
                    <Table.Th key="detectionControlStatus">Statut de contrôle</Table.Th>,
                    <Table.Th key="detectionPrescriptionStatus">Prescription</Table.Th>,
                    <Table.Th key="detectionValidationStatus">Statut de validation</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: DetectionDetail) => item.detectionObject.id,
                    (item: DetectionDetail) => <>{item.detectionObject.objectType.name}</>,
                    (item: DetectionDetail) => Math.round(item.score * 100),
                    (item: DetectionDetail) => <>{DETECTION_SOURCE_NAMES_MAP[item.detectionSource]}</>,
                    (item: DetectionDetail) => (
                        <>
                            {
                                DETECTION_CONTROL_STATUSES_NAMES_MAP[userGroupType][
                                    item.detectionData.detectionControlStatus
                                ]
                            }
                        </>
                    ),
                    (item: DetectionDetail) => (
                        <>
                            {
                                DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP[
                                    item.detectionData.detectionPrescriptionStatus || 'NOT_PRESCRIBED'
                                ]
                            }
                        </>
                    ),
                    (item: DetectionDetail) => (
                        <>{DETECTION_VALIDATION_STATUSES_NAMES_MAP[item.detectionData.detectionValidationStatus]}</>
                    ),
                ]}
            />
        </>
    );
};

const Component: React.FC = () => {
    const { objectsFilter, allObjectTypes, geoCustomZones, updateObjectsFilter } = useStatistics();

    if (!objectsFilter || !allObjectTypes || !geoCustomZones || !updateObjectsFilter) {
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
                geoCustomZones={geoCustomZones}
                updateObjectsFilter={updateObjectsFilter}
            />
        </LayoutBase>
    );
};

export default Component;
