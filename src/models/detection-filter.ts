import { DetectionControlStatus, DetectionValidationStatus } from '@/models/detection';

export type InterfaceDrawnFilter = 'ALL' | 'INSIDE_SELECTED_ZONES' | 'NONE';

export interface ObjectsFilter {
    objectTypesUuids: string[];
    detectionValidationStatuses: DetectionValidationStatus[];
    detectionControlStatuses: DetectionControlStatus[];
    score: number;
    prescripted: boolean | null;
    interfaceDrawn: InterfaceDrawnFilter;
    customZonesUuids: string[];
    // « Uniquement mon plan de contrôle »: the parcels of the group's plan and the objects « À contrôler »
    controlPlan?: boolean;
}
