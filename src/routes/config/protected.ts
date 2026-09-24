import About from '@/routes/About';
import HelpCenter from '@/routes/HelpCenter';
import Map from '@/routes/Map/index';
import Charts from '@/routes/Statistics/Charts';
import Table from '@/routes/Table';
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
            path: '/about',
            component: About,
            requiresAuth: true,
        },
        {
            path: '/help',
            component: HelpCenter,
            requiresAuth: true,
        },
    ],
};
