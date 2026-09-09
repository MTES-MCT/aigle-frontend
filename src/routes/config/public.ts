import Login from '@/routes/auth/Login';
import LoginVerify from '@/routes/auth/LoginVerify';
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
            path: '/login/verify/:token',
            component: LoginVerify,
            requiresAuth: false,
        },
        // Sans jeton : le lien a été tronqué par un client de messagerie, ou l'URL a
        // déjà été nettoyée. Sans cette route la page ne matche rien et reste blanche.
        {
            path: '/login/verify',
            component: LoginVerify,
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
