import ControlPlan from '@/routes/ControlPlan';
import HelpCenter from '@/routes/HelpCenter';
import Map from '@/routes/Map/index';
import Charts from '@/routes/Statistics/Charts';
import Table from '@/routes/Table';
import { useAuth } from '@/store/slices/auth';
import { RouteGroup } from './types';

export const protectedRoutes: RouteGroup = {
    name: 'protected',
    routes: [
        {
            path: '/map',
            component: Map,
            requiresAuth: true,
        },
        {
            path: '/statistics',
            component: Charts,
            requiresAuth: true,
        },
        {
            path: '/table',
            component: Table,
            requiresAuth: true,
        },
        {
            path: '/control-plan',
            component: ControlPlan,
            requiresAuth: true,
            isAccessible: () => useAuth.getState().canAccessControlPlan(),
        },
        {
            path: '/help',
            component: HelpCenter,
            requiresAuth: true,
        },
    ],
};
