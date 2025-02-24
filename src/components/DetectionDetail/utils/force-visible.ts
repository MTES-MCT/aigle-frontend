import { DetectionWithTile } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { DetectionObjectDetail } from '@/models/detection-object';
import cloneDeep from 'lodash/cloneDeep';

export const getFiltersToMakeVisible = (
    currentObjectsFilters: ObjectsFilter,
    invisibleDetectionObject: DetectionObjectDetail,
    invisibleDetection: DetectionWithTile,
): ObjectsFilter => {
    const objectFiltersUpdated = cloneDeep(currentObjectsFilters);

    // objectTypesUuids

    if (
        currentObjectsFilters.objectTypesUuids.length &&
        !currentObjectsFilters.objectTypesUuids.includes(invisibleDetectionObject.objectType.uuid)
    ) {
        objectFiltersUpdated.objectTypesUuids.push(invisibleDetectionObject.objectType.uuid);
    }

    // detectionValidationStatuses

    if (
        currentObjectsFilters.detectionValidationStatuses.length &&
        !currentObjectsFilters.detectionValidationStatuses.includes(
            invisibleDetection.detectionData.detectionValidationStatus,
        )
    ) {
        objectFiltersUpdated.detectionValidationStatuses.push(
            invisibleDetection.detectionData.detectionValidationStatus,
        );
    }

    // detectionControlStatuses

    if (
        currentObjectsFilters.detectionControlStatuses.length &&
        !currentObjectsFilters.detectionControlStatuses.includes(
            invisibleDetection.detectionData.detectionControlStatus,
        )
    ) {
        objectFiltersUpdated.detectionControlStatuses.push(invisibleDetection.detectionData.detectionControlStatus);
    }

    // we do not update score as it's bypassed when object is set to force visible

    // prescripted

    if (
        (invisibleDetection.detectionData.detectionPrescriptionStatus === 'NOT_PRESCRIBED' &&
            currentObjectsFilters.prescripted) ||
        (invisibleDetection.detectionData.detectionPrescriptionStatus === 'PRESCRIBED' &&
            !currentObjectsFilters.prescripted)
    ) {
        objectFiltersUpdated.prescripted = null;
    }

    // we do not update interfaceDrawn as not visible on the user interface

    if (currentObjectsFilters.interfaceDrawn !== 'ALL') {
        console.error('interfaceDrawn filter is not set to all, update filter function may not work correctly');
    }

    const detectionObjectGeoCustomZoneUuids = invisibleDetectionObject.geoCustomZones.map(({ uuid }) => uuid);

    if (detectionObjectGeoCustomZoneUuids.length === 0 && currentObjectsFilters.customZonesUuids.length) {
        objectFiltersUpdated.customZonesUuids = [];
    }

    if (
        detectionObjectGeoCustomZoneUuids.length &&
        !detectionObjectGeoCustomZoneUuids.some((uuid) => currentObjectsFilters.customZonesUuids.includes(uuid))
    ) {
        objectFiltersUpdated.customZonesUuids.push(...detectionObjectGeoCustomZoneUuids);
    }

    return objectFiltersUpdated;
};
