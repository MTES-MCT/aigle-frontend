export interface DeployedDataUser {
    uuid: string;
    email: string;
}

export interface DeployedDataUserGroup {
    uuid: string;
    name: string;
    users: DeployedDataUser[];
}

export interface DeployedDataCommune {
    uuid: string;
    name: string;
    // Per commune we count detection OBJECTS (an object detected across several tile
    // sets/years is one object) — not Detection rows like the per-tile-set breakdown.
    detectionObjectsCount: number;
    // Detection objects that fall inside at least one custom zone ("zone à enjeux").
    detectionObjectsInCustomZoneCount: number;
}

export interface DeployedDataCustomZone {
    uuid: string;
    name: string;
    categoryName: string | null;
    color: string | null;
}

export interface DeployedDataTileSet {
    uuid: string;
    name: string;
    date: string;
}

// Detection counts for one tile set (Detection.tile_set): total, and the subset whose
// object falls inside at least one custom zone ("zone à enjeux") — same criteria as the
// per-commune counts.
export interface DeployedDataDetectionsByTileSet {
    uuid: string;
    name: string;
    date: string;
    detectionsCount: number;
    detectionsInCustomZoneCount: number;
}

// Lightweight row served by the list endpoint (the full breakdown lives on the detail endpoint).
export interface DeployedDataDepartmentSummary {
    uuid: string;
    name: string;
    communesWithDetectionsCount: number;
    usersCount: number;
    tileSetYears: string[];
}

export interface DeployedDataDepartment {
    uuid: string;
    name: string;
    parcelsCount: number;
    // Parcels updated by the SITADEL import (a parcel with a SITADEL-sourced detection).
    sitadelUpdatedParcelsCount: number;
    communesWithDetectionsCount: number;
    communes: DeployedDataCommune[];
    userGroups: DeployedDataUserGroup[];
    customZones: DeployedDataCustomZone[];
    tileSets: DeployedDataTileSet[];
    detectionsByTileSet: DeployedDataDetectionsByTileSet[];
}

// Distinct users across all the department's groups (a user may belong to several groups).
export const getDeployedDepartmentUsersCount = (department: DeployedDataDepartment): number =>
    new Set(department.userGroups.flatMap((group) => group.users.map((user) => user.uuid))).size;
