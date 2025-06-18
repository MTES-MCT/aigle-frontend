import { mapEndpoints, usersEndpoints } from '@/api/endpoints';
import { MapSettings } from '@/models/map-settings';
import { User } from '@/models/user';
import { allRoutes } from '@/routes/config';
import { useMap } from '@/store/slices/map';
import { useStatistics } from '@/store/slices/statistics';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth-context';
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
    const { isAuthenticated, setUser } = useAuth();
    const { setMapSettings } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();

    const isAuthenticated_ = isAuthenticated();

    const getUser = useCallback(async () => {
        try {
            const { data: user } = await api.get<User>(usersEndpoints.me);
            setUser(user);
            setupMatomo(user);
        } catch (err) {
            console.error(err);
        }
    }, [setUser]);

    useEffect(() => {
        Crisp.configure('b7048ccf-68b6-424e-a7c0-0c6e8b5d2724');
    }, []);

    const getMapSettings = useCallback(async () => {
        try {
            const res = await api.get<MapSettings>(mapEndpoints.settings);
            setMapSettings(res.data);
            setStatisticsMapSettings(res.data);
            return res.data;
        } catch (err) {
            console.error(err);
        }
    }, [setMapSettings]);

    useEffect(() => {
        if (isAuthenticated_) {
            getUser();
            getMapSettings();
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
