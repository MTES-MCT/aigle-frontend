import { DetectionValidationStatus } from '@/models/detection';

export interface ValidationStatusObjectTypesGlobal {
    detectionValidationStatus: DetectionValidationStatus;
    detectionsCount: number;

    objectTypeColor: string;
    objectTypeName: string;
    objectTypeUuid: string;
}
