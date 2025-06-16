import { ComponentType } from 'react';

export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'COLLECTIVITY' | 'DDTM';

export interface RouteConfig {
    path: string;
    component: ComponentType;
    roles?: UserRole[];
    requiresAuth?: boolean;
}

export interface RouteGroup {
    name: string;
    routes: RouteConfig[];
}
