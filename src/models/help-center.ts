import { Timestamped, Uuided } from '@/models/data';

export interface PathValidationProgress {
    checkedItems: number[];
    checkedCount: number;
    itemCount: number | null;
    completedAt: string | null;
    updatedAt: string | null;
}

export interface PathValidationProgressInput {
    itemCount: number;
    check?: number[];
    uncheck?: number[];
}

export interface Webinar extends Uuided, Timestamped {
    title: string;
    // Sanitized HTML from the admin rich text editor.
    description: string;
    // Paris wall-clock values ("YYYY-MM-DD", "HH:MM"), kept as strings so no user timezone ever shifts them.
    date: string;
    startTime: string | null;
    endTime: string | null;
    replayUrl: string | null;
    registrationUrl: string | null;
    visioUrl: string | null;
}
