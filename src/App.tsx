import { mapEndpoints, userGroupEndpoints, usersEndpoints } from '@/api/endpoints';
import Loader from '@/components/ui/Loader';
import { MapSettings } from '@/models/map-settings';
import { User } from '@/models/user';
import { UserGroupDetail } from '@/models/user-group';
import { allRoutes } from '@/routes/config';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { useStatistics } from '@/store/slices/statistics';
import api, { ApiError } from '@/utils/api';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { setupMatomo } from '@/utils/matomo';
import ProtectedRoute from '@/utils/ProtectedRoute';
import { getStoredUserGroupUuid, isScopeDisabledPath, setScopedUserGroupUuid } from '@/utils/scope';
import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _paq?: any[];
    }
}

/**
 * Make sure a SUPER_ADMIN has a user group to browse as. Returns false when the
 * page is reloading (a fresh scope was just persisted) — the caller must stop.
 */
const resolveSuperAdminScope = async (): Promise<boolean> => {
    if (getStoredUserGroupUuid()) {
        return true;
    }

    const userGroups = await api<UserGroupDetail[]>(userGroupEndpoints.list);

    if (!userGroups.length) {
        return true;
    }

    setScopedUserGroupUuid(userGroups[0].uuid);

    return false;
};

const App: React.FC = () => {
    const { isAuthenticated, setUser, logout } = useAuth();
    const { setMapSettings } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();
    const [bootstrapped, setBootstrapped] = useState(false);

    const isAuthenticated_ = isAuthenticated();

    /**
     * Nothing scoped may be requested before we know WHO we are and, for a
     * SUPER_ADMIN, WHICH group we browse as — an unscoped answer would fill the
     * stores with every object type and every tile set year. So the router stays
     * behind a loader until this resolves.
     */
    const bootstrap = useCallback(async () => {
        let user: User;

        try {
            user = await api<User>(usersEndpoints.me);
        } catch (err) {
            // Only a rejected identity means "log out". A network blip — or a stale
            // group scope, which the API client recovers from by reloading — must not
            // throw the session away.
            if (err instanceof ApiError && [401, 403].includes(err.status)) {
                logout();
            } else {
                console.error(err);
                setBootstrapped(true);
            }

            return;
        }

        setUser(user);
        setupMatomo(user);

        // The admin section is deliberately unscoped, and never reads the map stores.
        if (isScopeDisabledPath(window.location.pathname)) {
            setBootstrapped(true);
            return;
        }

        try {
            if (user.userRole === 'SUPER_ADMIN' && !(await resolveSuperAdminScope())) {
                return; // reloading with the new scope
            }

            const mapSettings = await api<MapSettings>(mapEndpoints.settings);
            setMapSettings(mapSettings);
            setStatisticsMapSettings(mapSettings);
        } catch (err) {
            console.error(err);
        }

        setBootstrapped(true);
    }, [setUser, logout, setMapSettings, setStatisticsMapSettings]);

    useEffect(() => {
        if (isAuthenticated_) {
            bootstrap();
        }
    }, [isAuthenticated_, bootstrap]);

    if (isAuthenticated_ && !bootstrapped) {
        return <Loader fullScreen />;
    }

    return (
        <Router>
            <Routes>
                <Route index element={<Navigate to="/map" replace />} />
                <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                {allRoutes.map((route) => {
                    const { path, component: Component, roles, requiresAuth = true } = route;

                    if (requiresAuth === false) {
                        return (
                            <Route
                                key={path}
                                path={path}
                                element={isAuthenticated_ ? <Navigate to={DEFAULT_ROUTE} /> : <Component />}
                            />
                        );
                    }

                    if (roles) {
                        return (
                            <Route
                                key={path}
                                path={path}
                                element={
                                    <ProtectedRoute roles={roles}>
                                        <Component />
                                    </ProtectedRoute>
                                }
                            />
                        );
                    }

                    return (
                        <Route
                            key={path}
                            path={path}
                            element={
                                <ProtectedRoute>
                                    <Component />
                                </ProtectedRoute>
                            }
                        />
                    );
                })}
            </Routes>
        </Router>
    );
};

export default App;
