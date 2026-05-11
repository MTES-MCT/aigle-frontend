import React from 'react';

export interface ColumnSpec {
    name: string;
    label: string;
    description: string;
    example?: string;
}

export interface BulkError {
    line: number | null;
    message: string;
}

export interface BulkImportPreviewResponse {
    rowsCount: number;
    preview: Record<string, string>[];
    errors: BulkError[];
}

export interface BulkImportResponse {
    createdCount: number;
    created?: { email: string; password: string }[];
}

export interface BulkConfig {
    entityLabel: string;
    fileBaseName: string;
    listEndpoint: string;
    exportEndpoint: string;
    previewEndpoint: string;
    importEndpoint: string;
    columns: ColumnSpec[];
    renderSuccessExtra?: (response: BulkImportResponse) => React.ReactNode;
}
