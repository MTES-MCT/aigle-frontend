export type DataDeploymentStatus = 'NOT_DEPLOYED' | 'DEPLOYMENT_RUNNING' | 'DEPLOYED';

export interface DataDeploymentBatch {
    id: number;
    // null for a batch without a run, listed in the flat "Batches" listing only
    runId: number | null;
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

// flat "Batches" listing: a batch plus the geozone of its run (null = none, the admin picks one)
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
    // newest first
    runIds: number[];
    batches: DataDeploymentBatch[];
    zaeLayers: DataDeploymentZaeLayer[];
}

// a plan's status derives from its batches'
export type DataDeploymentPlanStatus = DataDeploymentStatus | 'PARTIALLY_DEPLOYED' | 'NO_BATCH';

export interface DataDeploymentPlanRun {
    id: number;
    name: string | null;
    type: string | null;
    // ML pipeline status: pending, running, done, error...
    status: string | null;
    year: number | null;
    createdAt: string | null;
}

// "Plans" listing, one row per detections.plan
export interface DataDeploymentPlan {
    uuid: string;
    id: number;
    createdAt: string;
    // commune iso / epci siren / department insee code
    geozoneCode: string | null;
    // pending until the ML pipeline has created its runs, then done
    status: string | null;
    mode: string | null;
    type: string | null;
    // null when the code matches no collectivity of the app: not deployable
    geozoneId: number | null;
    geozoneName: string | null;
    geozoneType: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    // newest first
    runs: DataDeploymentPlanRun[];
    batches: DataDeploymentBatch[];
    zaeLayers: DataDeploymentZaeLayer[];
    deployStatus: DataDeploymentPlanStatus;
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
