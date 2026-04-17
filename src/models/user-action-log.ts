import { Timestamped, Uuided } from '@/models/data';

export const userActionLogActions = ['CREATE', 'UPDATE', 'PARTIAL_UPDATE', 'DESTROY', 'CUSTOM'] as const;
export type UserActionLogAction = (typeof userActionLogActions)[number];

export interface UserActionLogUser {
    uuid: string;
    email: string;
}

export interface UserActionLog extends Uuided, Timestamped {
    route: string;
    action: UserActionLogAction;
    data: unknown;
    user: UserActionLogUser;
}
