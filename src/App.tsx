import { mapEndpoints, usersEndpoints } from '@/api/endpoints';
import { MapSettings } from '@/models/map-settings';
import { User } from '@/models/user';
import { allRoutes } from '@/routes/config';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { useStatistics } from '@/store/slices/statistics';
import api from '@/utils/api';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { setupMatomo } from '@/utils/matomo';
import ProtectedRoute from '@/utils/ProtectedRoute';
import React, { useCallback, useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _paq?: any[];
        BrevoConversations?: (...args: unknown[]) => void;
    }
}

// Brevo chat: shown only for logged-in users outside /admin; pushes their email so the widget skips its identity form.
const BrevoChat: React.FC = () => {
    const { userMe } = useAuth();
    const { pathname } = useLocation();

    useEffect(() => {
        const brevo = window.BrevoConversations;
        if (!brevo) {
            return;
        }

        if (userMe && !pathname.startsWith('/admin')) {
            brevo('updateIntegrationData', { email: userMe.email });
            brevo('show');
        } else {
            brevo('hide');
        }
    }, [userMe, pathname]);

    return null;
};

const App: React.FC = () => {
    const { isAuthenticated, setUser, logout, setSelectedUserGroupUuid } = useAuth();
    const { setMapSettings } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();

    const isAuthenticated_ = isAuthenticated();

    const getUser = useCallback(async () => {
        try {
            const user = await api<User>(usersEndpoints.me);
            setUser(user);
            setupMatomo(user);
        } catch (err) {
            logout();
        }
    }, [setUser]);

    const getMapSettings = useCallback(async () => {
        try {
            const mapSettings = await api<MapSettings>(mapEndpoints.settings);
            setMapSettings(mapSettings);
            setStatisticsMapSettings(mapSettings);
            return mapSettings;
        } catch (err) {
            if (useAuth.getState().selectedUserGroupUuid) {
                setSelectedUserGroupUuid(undefined);
                try {
                    const mapSettings = await api<MapSettings>(mapEndpoints.settings);
                    setMapSettings(mapSettings);
                    setStatisticsMapSettings(mapSettings);
                    return mapSettings;
                } catch (retryErr) {
                    console.error(retryErr);
                }
            } else {
                console.error(err);
            }
        }
    }, [setMapSettings]);

    useEffect(() => {
        if (isAuthenticated_) {
            getUser();

            const { userMe: persistedUser } = useAuth.getState();

            if (persistedUser?.userRole !== 'SUPER_ADMIN') {
                getMapSettings();
            }
        }
    }, [isAuthenticated_, getUser]);

    return (
        <Router>
            <BrevoChat />
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
