export type DataDeploymentStatus = 'NOT_DEPLOYED' | 'DEPLOYMENT_RUNNING' | 'DEPLOYED';

export interface DataDeploymentBatch {
    id: number;
    name: string | null;
    createdAt: string | null;
    tilesUrl: string | null;
    deployStatus: DataDeploymentStatus;
}

export interface DataDeploymentZaeLayer {
    id: number;
    createdAt: string | null;
    name: string | null;
    type: string | null;
    typeName: string | null;
    year: number | null;
    deployStatus: DataDeploymentStatus;
}

// flat "Batches" listing: a batch plus the geozone of its run (null = not deployable)
export interface DataDeploymentBatchItem extends DataDeploymentBatch {
    uuid: string;
    geozoneId: number | null;
    geozoneName: string | null;
}

// "Zones à enjeux" listing, one row per department
export interface DataDeploymentZaeGroup {
    uuid: string;
    departmentCode: string;
    departmentName: string | null;
    geozoneId: number | null;
    zaeLayers: DataDeploymentZaeLayer[];
}

export interface DataDeploymentRun {
    uuid: string;
    geozoneName: string | null;
    createdAt: string | null;
    batches: DataDeploymentBatch[];
    zaeLayers: DataDeploymentZaeLayer[];
}

export interface DataDeploymentRunResult {
    geozoneName: string;
    userGroupName: string;
    tileSetsCreated: string[];
    skippedBatches: { id: number; name: string | null }[];
    queuedCommands: { commandName: string; commandRunUuid: string }[];
}

// single-item deploys (one batch / one zae layer) only surface the queued commands
export type DataDeploymentItemRunResult = Pick<DataDeploymentRunResult, 'queuedCommands'>;
