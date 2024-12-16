import { DetectionControlStatus, DetectionValidationStatus } from '@/models/detection';

type InterfaceDrawnFilter = 'ALL' | 'INSIDE_SELECTED_ZONES' | 'NONE';

export interface ObjectsFilter {
    objectTypesUuids: string[];
    detectionValidationStatuses: DetectionValidationStatus[];
    detectionControlStatuses: DetectionControlStatus[];
    score: number;
    prescripted: boolean | null;
    interfaceDrawn: InterfaceDrawnFilter;
    customZonesUuids: string[];
}
