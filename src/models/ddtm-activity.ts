import { Uuided } from '@/models/data';
import { DetectionControlStatus } from '@/models/detection';

export type DdtmActivityGranularity = 'MONTH' | 'QUARTER' | 'SEMESTER';

// Mutually exclusive engagement tiers over a period (see the InfoCards in the UI).
export type UserActivityStatus = 'PILOT' | 'RECURRENT' | 'ACTIVE' | 'INACTIVE';

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

// One period bucket: entities (users or groups) counted per tier + the total.
export interface DdtmActivityPeriodTier {
    // Period key: "YYYY-MM", "YYYY-Q<n>" or "YYYY-S<n>".
    period: string;
    pilotCount: number;
    recurrentCount: number;
    activeCount: number;
    inactiveCount: number;
    totalCount: number;
}

export interface DdtmActivityStatusCount {
    status: DetectionControlStatus;
    count: number;
}

export interface DdtmActivityControlStatusPeriod {
    period: string;
    counts: DdtmActivityStatusCount[];
}

export interface DdtmActivityCountPeriod {
    period: string;
    count: number;
}

// Department-wide chart: each collectivity group classified per period.
export interface DdtmActivityGroupsActivity {
    granularity: DdtmActivityGranularity;
    activityByPeriod: DdtmActivityPeriodTier[];
}

// One group's per-period charts.
export interface DdtmActivityUserGroupActivity extends Uuided {
    name: string;
    granularity: DdtmActivityGranularity;
    deploymentDate: string | null;
    // Last period key entirely before deployment (grey "not deployed" zone boundary).
    noDataUntilPeriod: string | null;
    activityByPeriod: DdtmActivityPeriodTier[];
    controlStatusChangesByPeriod: DdtmActivityControlStatusPeriod[];
    reportDownloadsByPeriod: DdtmActivityCountPeriod[];
    connectionsByPeriod: DdtmActivityCountPeriod[];
}
