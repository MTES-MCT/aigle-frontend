import { Uuided } from '@/models/data';
import { DetectionControlStatus } from '@/models/detection';

export type DdtmActivityGranularity = 'MONTH' | 'QUARTER' | 'SEMESTER';

// Mutually exclusive engagement tiers over a period (see the InfoCards in the UI).
export type UserActivityStatus = 'PILOT' | 'RECURRENT' | 'ACTIVE' | 'INACTIVE';

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
    // null for a non-DDTM user: they get the own-group dashboard, not the department one.
    departmentName: string | null;
    userGroupsCount: number;
    activeUserGroupsCount: number;
    // Every group the user may open: the department's groups, or their own.
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

// One group's tier per period. Periods where the group has no data yet are absent.
export interface DdtmActivityGroupTiers extends Uuided {
    name: string;
    tierByPeriod: Record<string, UserActivityStatus>;
}

// Department-wide chart: each collectivity group classified per period.
export interface DdtmActivityGroupsActivity {
    granularity: DdtmActivityGranularity;
    activityByPeriod: DdtmActivityPeriodTier[];
    groups: DdtmActivityGroupTiers[];
}

// One group's per-period charts.
export interface DdtmActivityUserGroupActivity extends Uuided {
    name: string;
    granularity: DdtmActivityGranularity;
    deploymentDate: string | null;
    // Period key containing the deployment date (the charts' deployment marker).
    deploymentPeriod: string | null;
    // Last period key entirely before deployment (periods with no activity to show).
    noDataUntilPeriod: string | null;
    activityByPeriod: DdtmActivityPeriodTier[];
    controlStatusChangesByPeriod: DdtmActivityControlStatusPeriod[];
    reportDownloadsByPeriod: DdtmActivityCountPeriod[];
    connectionsByPeriod: DdtmActivityCountPeriod[];
}
