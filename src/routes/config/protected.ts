import About from '@/routes/About';
import Help from '@/routes/Help';
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
            component: Help,
            requiresAuth: true,
        },
    ],
};
