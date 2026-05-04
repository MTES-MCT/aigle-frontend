import React from 'react';

export interface ColumnSpec {
    name: string;
    label: string;
    description: string;
    example?: string;
}

export interface BulkImportPreviewResponse {
    rowsCount: number;
    preview: Record<string, string>[];
    errors: string[];
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
