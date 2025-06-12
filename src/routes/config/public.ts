import Login from '@/routes/auth/Login';
import ResetPassword from '@/routes/auth/ResetPassword';
import ResetPasswordConfirmation from '@/routes/auth/ResetPasswordConfirmation';
import { RouteGroup } from './types';

export const publicRoutes: RouteGroup = {
    name: 'public',
    routes: [
        {
            path: '/login',
            component: Login,
            requiresAuth: false,
        },
        {
            path: '/reset-password',
            component: ResetPassword,
            requiresAuth: false,
        },
        {
            path: '/reset-password/:uid/:token',
            component: ResetPasswordConfirmation,
            requiresAuth: false,
        },
    ],
};
