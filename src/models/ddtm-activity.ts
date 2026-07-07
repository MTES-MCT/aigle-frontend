import { Uuided } from '@/models/data';
import { DetectionControlStatus } from '@/models/detection';

export type UserActivityStatus = 'PILOT' | 'ACTIVE' | 'INACTIVE';

// Extends Uuided so it can back the shared DataTable (keyed by uuid).
export interface DdtmActivityUser extends Uuided {
    email: string;
    operationalActionsCount: number;
    connectionsCount: number;
    activityStatus: UserActivityStatus;
}

export interface DdtmActivityUserGroup extends Uuided {
    name: string;
    usersCount: number;
    activeUsersCount: number;
    pilotUsersCount: number;
    // Deployment = the group's earliest member first login; both null if none ever logged in.
    deploymentDate: string | null;
    deployedSinceWeeks: number | null;
}

export interface DdtmActivityUserGroupOption extends Uuided {
    name: string;
}

export interface DdtmActivitySummary {
    departmentName: string;
    userGroupsCount: number;
    activeUserGroupsCount: number;
    userGroups: DdtmActivityUserGroupOption[];
}

export interface DdtmActivityMonth {
    // "YYYY-MM"
    month: string;
    pilotUsersCount: number;
    activeUsersCount: number;
    inactiveUsersCount: number;
}

export interface DdtmActivityStatusCount {
    status: DetectionControlStatus;
    count: number;
}

export interface DdtmActivityControlStatusMonth {
    month: string;
    counts: DdtmActivityStatusCount[];
}

export interface DdtmActivityCountMonth {
    month: string;
    count: number;
}

export interface DdtmActivityUserGroupMonthly extends Uuided {
    name: string;
    months: DdtmActivityMonth[];
    controlStatusChangesByMonth: DdtmActivityControlStatusMonth[];
    reportDownloadsByMonth: DdtmActivityCountMonth[];
    connectionsByMonth: DdtmActivityCountMonth[];
}
