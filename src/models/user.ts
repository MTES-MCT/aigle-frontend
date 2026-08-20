import { Timestamped, Uuided } from '@/models/data';
import { FeatureFlag, UserGroup } from '@/models/user-group';

export const userRoles = ['SUPER_ADMIN', 'ADMIN', 'REGULAR', 'DEACTIVATED'] as const;
export type UserRole = (typeof userRoles)[number];

export const userGroupRights = ['WRITE', 'ANNOTATE', 'READ'] as const;
export type UserGroupRight = (typeof userGroupRights)[number];

export interface UserUserGroupInput {
    userGroupUuid: string;
    userGroupRights: UserGroupRight[];
}

export interface UserUserGroup {
    userGroup: UserGroup;
    userGroupRights: UserGroupRight[];
}

export interface User extends Uuided, Timestamped {
    email: string;
    userRole: UserRole;
    isStaff: boolean;
    userUserGroups: UserUserGroup[];
    // Union of the feature flags of every group the user belongs to.
    featureFlags: FeatureFlag[];
}
