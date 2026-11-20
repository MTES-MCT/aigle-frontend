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
    // « Uniquement mes plans de contrôle »: the parcels of the active plans of the user's groups and the
    // objects « À contrôler »
    controlPlan?: boolean;
    // with `controlPlan`, only the parcels of this active plan
    controlPlanUuid?: string | null;
}
