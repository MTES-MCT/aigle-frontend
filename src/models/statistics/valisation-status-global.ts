import { DetectionValidationStatus } from '@/models/detection';

export interface ValidationStatusGlobal {
    detectionValidationStatus: DetectionValidationStatus;
    detectionsCount: number;
}
