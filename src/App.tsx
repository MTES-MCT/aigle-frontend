import { MAP_SETTINGS_ENDPOINT, USERS_ME_ENDPOINT } from '@/api-endpoints';
import { MapSettings } from '@/models/map-settings';
import { User } from '@/models/user';
import About from '@/routes/About';
import Help from '@/routes/Help';
import Map from '@/routes/Map/index.tsx';
import CollectiviteForm from '@/routes/admin/collectivite/CollectiviteForm';
import CollectiviteList from '@/routes/admin/collectivite/CollectiviteList';
import CustomZoneForm from '@/routes/admin/custom-zone/CustomZoneForm';
import CustomZoneList from '@/routes/admin/custom-zone/CustomZoneList';
import ImportsPage from '@/routes/admin/imports';
import ObjectTypeCategoryForm from '@/routes/admin/object-type-category/ObjectTypeCategoryForm';
import ObjectTypeCategoryList from '@/routes/admin/object-type-category/ObjectTypeCategoryList';
import ObjectTypeForm from '@/routes/admin/object-type/ObjectTypeForm';
import ObjectTypeList from '@/routes/admin/object-type/ObjectTypeList';
import TileSetForm from '@/routes/admin/tile-set/TileSetForm';
import TileSetList from '@/routes/admin/tile-set/TileSetList';
import UserGroupForm from '@/routes/admin/user-group/UserGroupForm';
import UserGroupList from '@/routes/admin/user-group/UserGroupList';
import UserForm from '@/routes/admin/user/UserForm';
import UserList from '@/routes/admin/user/UserList';
import Login from '@/routes/auth/Login';
import ResetPassword from '@/routes/auth/ResetPassword';
import ResetPasswordConfirmation from '@/routes/auth/ResetPasswordConfirmation';
import ProtectedRoute from '@/utils/ProtectedRoute';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth-context';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { useStatistics } from '@/utils/context/statistics-context';
import { Crisp } from 'crisp-sdk-web';
import React, { useCallback, useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Charts from './routes/statistics/Charts';

const App: React.FC = () => {
    const { isAuthenticated, setUser } = useAuth();
    const { setMapSettings } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();

    const isAuthenticated_ = isAuthenticated();

    const getUser = useCallback(async () => {
        try {
            const res = await api.get<User>(USERS_ME_ENDPOINT);
            setUser(res.data);
        } catch (err) {
            console.error(err);
        }
    }, [setUser]);

    useEffect(() => {
        Crisp.configure('b7048ccf-68b6-424e-a7c0-0c6e8b5d2724');
    }, []);

    const getMapSettings = useCallback(async () => {
        try {
            const res = await api.get<MapSettings>(MAP_SETTINGS_ENDPOINT);
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
                <Route path="/login" element={isAuthenticated_ ? <Navigate to={DEFAULT_ROUTE} /> : <Login />} />
                <Route
                    path="/reset-password/:uid/:token"
                    element={isAuthenticated_ ? <Navigate to={DEFAULT_ROUTE} /> : <ResetPasswordConfirmation />}
                />
                <Route
                    path="/reset-password"
                    element={isAuthenticated_ ? <Navigate to={DEFAULT_ROUTE} /> : <ResetPassword />}
                />
                <Route
                    path="/map"
                    element={
                        <ProtectedRoute>
                            <Map />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/statistics"
                    element={
                        <ProtectedRoute>
                            <Charts />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/about"
                    element={
                        <ProtectedRoute>
                            <About />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/help"
                    element={
                        <ProtectedRoute>
                            <Help />
                        </ProtectedRoute>
                    }
                />

                <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/user-groups"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserGroupList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/user-groups/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserGroupForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/user-groups/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <UserGroupForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/custom-zones"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <CustomZoneList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/custom-zones/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <CustomZoneForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/custom-zones/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <CustomZoneForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/collectivites"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <CollectiviteList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/collectivites/:collectivityType/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <CollectiviteForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/object-types"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/object-types/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/object-types/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/object-type-categories"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeCategoryList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/object-type-categories/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeCategoryForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/object-type-categories/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ObjectTypeCategoryForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/tile-sets"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <TileSetList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/tile-sets/form"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <TileSetForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/tile-sets/form/:uuid"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <TileSetForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/imports"
                    element={
                        <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                            <ImportsPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;
