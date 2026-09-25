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
