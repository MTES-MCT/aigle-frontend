import { DetectionValidationStatus } from '@/models/detection';

export interface ValidationStatusEvolution {
    date: string;
    detectionValidationStatus: DetectionValidationStatus;
    detectionsCount: number;
    name: string;
    uuid: string;
}
