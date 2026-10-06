import { UserRole } from '@/models/user';
import { ComponentType } from 'react';

export interface RouteConfig {
    path: string;
    component: ComponentType;
    roles?: UserRole[];
    requiresAuth?: boolean;
    // A rule on top of the roles, such as a feature flag. Users it turns away are sent to the map.
    isAccessible?: () => boolean;
}

export interface RouteGroup {
    name: string;
    routes: RouteConfig[];
}
