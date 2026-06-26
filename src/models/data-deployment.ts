export type DataDeploymentStatus = 'NOT_DEPLOYED' | 'DEPLOYMENT_RUNNING' | 'DEPLOYED';

export interface DataDeploymentBatch {
    name: string | null;
    createdAt: string | null;
    tilesUrl: string | null;
    deployStatus: DataDeploymentStatus;
}

export interface DataDeploymentZaeLayer {
    createdAt: string | null;
    name: string | null;
    type: string | null;
    typeName: string | null;
    year: number | null;
    deployStatus: DataDeploymentStatus;
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
