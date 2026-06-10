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
    detectionsCount: number;
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
    communesWithDetectionsCount: number;
    communes: DeployedDataCommune[];
    userGroups: DeployedDataUserGroup[];
    customZones: DeployedDataCustomZone[];
    tileSets: DeployedDataTileSet[];
}

// Distinct users across all the department's groups (a user may belong to several groups).
export const getDeployedDepartmentUsersCount = (department: DeployedDataDepartment): number =>
    new Set(department.userGroups.flatMap((group) => group.users.map((user) => user.uuid))).size;
