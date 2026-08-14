import { GeoZone, GeoZoneType } from '@/models/geo/geo-zone';
import { User } from '@/models/user';
import { UserGroupType } from '@/models/user-group';
import { resetBrevo } from '@/utils/brevo';
import { clearStoredUserGroupUuid } from '@/utils/scope';
import * as Sentry from '@sentry/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    accessToken?: string;
    refreshToken?: string;
    userMe?: User;

    setAccessToken: (accessToken?: string) => void;
    setRefreshToken: (refreshToken: string) => void;
    setUser: (userMe?: User) => void;
    logout: () => void;
    getUserGroupType: () => UserGroupType;
    getCanViewStatistics: () => boolean;
    getAccessibleGeozones: (geoZoneType?: GeoZoneType) => GeoZone[];

    isAuthenticated: () => boolean;
}

const useAuth = create<AuthState>()(
    persist(
        (set, get) => ({
            setAccessToken: (accessToken) => {
                set(() => ({
                    accessToken,
                }));
            },
            setRefreshToken: (refreshToken) => {
                set(() => ({
                    refreshToken,
                }));
            },
            setUser: (userMe?: User) => {
                set(() => ({
                    userMe,
                }));
                Sentry.setUser(userMe ? { id: userMe.uuid, email: userMe.email, userRole: userMe.userRole } : null);
            },
            logout: () => {
                set(() => ({
                    refreshToken: undefined,
                    accessToken: undefined,
                    userMe: undefined,
                }));
                clearStoredUserGroupUuid();
                resetBrevo();
                window.location.reload();
            },
            getUserGroupType: () => {
                const userMe = get().userMe;

                if (!userMe) {
                    return 'COLLECTIVITY';
                }

                if (userMe.userUserGroups.find(({ userGroup }) => userGroup.userGroupType === 'DDTM')) {
                    return 'DDTM';
                }

                return 'COLLECTIVITY';
            },
            getCanViewStatistics: () => {
                const userMe = get().userMe;

                // Internal staff and super-admins only for now, while the DDTM dashboard is
                // being rolled out. A super-admin reads the dashboard of the group they are
                // scoped to (X-User-Group-Uuid), like everywhere else in the app.
                return userMe?.isStaff === true || userMe?.userRole === 'SUPER_ADMIN';
            },
            getAccessibleGeozones: (geoZoneType?: GeoZoneType) => {
                const userMe = get().userMe;

                if (!userMe) {
                    return [];
                }

                const geoZones = userMe.userUserGroups.flatMap(({ userGroup }) => userGroup.geoZones);

                if (geoZoneType) {
                    return geoZones.filter((geoZone) => geoZone.geoZoneType === geoZoneType);
                }

                return geoZones;
            },
            isAuthenticated: () => !!get().accessToken,
        }),
        {
            name: 'auth',
        },
    ),
);

export { useAuth };
