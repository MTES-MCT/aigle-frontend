import { RouteConfig } from '@/routes/config/types';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { isScopeBoundaryCrossed } from '@/utils/scope';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Location, Navigate, useLocation } from 'react-router-dom';

// Where /login sends the user back after signing in.
export interface LoginRedirectState {
    from?: Pick<Location, 'pathname' | 'search' | 'hash'>;
}

interface ComponentProps {
    // Absent for the not-found page, which anyone signed in may see.
    route?: RouteConfig;
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ children, route }) => {
    const { isAuthenticated, userMe, getUserGroupType } = useAuth();
    const { pathname, search, hash } = useLocation();
    const authenticated = isAuthenticated();

    let deniedTrackingName: string | null = null;
    if (authenticated && route && userMe) {
        if (route.roles && !route.roles.includes(userMe.userRole)) {
            deniedTrackingName = route.path;
        } else if (route.isAccessible && !route.isAccessible()) {
            deniedTrackingName = `${route.path} : ${userMe.userUserGroups.length ? getUserGroupType() : 'Aucun groupe'}`;
        }
    }

    // A session opened on the admin section has not loaded the map stores: the map needs a full load.
    const fullLoadOnDenied =
        !!deniedTrackingName && isScopeBoundaryCrossed(pathname, DEFAULT_ROUTE) && !useMap.getState().settings;

    // A ref, not a module flag: StrictMode runs this twice for one redirect, a later attempt mounts anew.
    const trackedRef = useRef(false);
    useEffect(() => {
        if (!deniedTrackingName || trackedRef.current) {
            return;
        }

        trackedRef.current = true;
        trackEvent(TRACKING_CATEGORIES.navigation, 'Accès refusé', deniedTrackingName);

        if (fullLoadOnDenied) {
            window.location.replace(DEFAULT_ROUTE);
        }
    }, [deniedTrackingName, fullLoadOnDenied]);

    if (!authenticated) {
        const state: LoginRedirectState = { from: { pathname, search, hash } };
        return <Navigate to="/login" replace state={state} />;
    }

    if (deniedTrackingName) {
        return fullLoadOnDenied ? null : <Navigate to={DEFAULT_ROUTE} />;
    }

    return <>{children}</>;
};

export default Component;
