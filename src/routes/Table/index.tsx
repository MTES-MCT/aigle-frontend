import { getDetectionListEndpoint } from '@/api-endpoints';
import FilterObjects from '@/components/FilterObjects';
import LayoutBase from '@/components/LayoutBase';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import Loader from '@/components/ui/Loader';
import { DetectionDetail } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { useAuth } from '@/utils/auth-context';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP,
    DETECTION_SOURCE_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { useStatistics } from '@/utils/context/statistics-context';
import { Table } from '@mantine/core';
import React, { useMemo } from 'react';
import classes from './index.module.scss';

const ENDPOINT = getDetectionListEndpoint(true);

const Component: React.FC = () => {
    const { allObjectTypes, objectsFilter, geoCustomZones, updateObjectsFilter } = useStatistics();
    const { getUserGroupType, userMe } = useAuth();
    const userGroupType = useMemo(() => getUserGroupType(), [userMe]);

    if (!allObjectTypes || !objectsFilter || !geoCustomZones) {
        return (
            <LayoutBase>
                <Loader className={classes.loader} />
            </LayoutBase>
        );
    }

    if (!objectsFilter) {
    }

    return (
        <LayoutBase>
            <DataTable<DetectionDetail, ObjectsFilter>
                endpoint={ENDPOINT}
                filter={objectsFilter}
                SoloAccordion={
                    <SoloAccordion opened>
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
        </LayoutBase>
    );
};

export default Component;
