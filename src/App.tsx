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
import { Crisp } from 'crisp-sdk-web';
import React, { useCallback, useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _paq?: any[];
    }
}

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

    useEffect(() => {
        Crisp.configure('b7048ccf-68b6-424e-a7c0-0c6e8b5d2724');
    }, []);

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
