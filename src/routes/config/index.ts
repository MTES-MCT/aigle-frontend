import { adminRoutes } from './admin';
import { protectedRoutes } from './protected';
import { publicRoutes } from './public';
import { RouteGroup } from './types';

export const routeGroups: RouteGroup[] = [publicRoutes, protectedRoutes, adminRoutes];

export const allRoutes = routeGroups.flatMap((group) => group.routes);

export * from './types';
