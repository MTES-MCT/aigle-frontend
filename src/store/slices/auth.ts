import { GeoZone, GeoZoneType } from '@/models/geo/geo-zone';
import { User } from '@/models/user';
import { UserGroupType } from '@/models/user-group';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    accessToken?: string;
    refreshToken?: string;
    userMe?: User;
    selectedUserGroupUuid?: string;

    setAccessToken: (accessToken?: string) => void;
    setRefreshToken: (refreshToken: string) => void;
    setUser: (userMe?: User) => void;
    setSelectedUserGroupUuid: (uuid?: string) => void;
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
            },
            setSelectedUserGroupUuid: (uuid?: string) => {
                set(() => ({
                    selectedUserGroupUuid: uuid,
                }));
            },
            logout: () => {
                set(() => ({
                    refreshToken: undefined,
                    accessToken: undefined,
                    userMe: undefined,
                    selectedUserGroupUuid: undefined,
                }));
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
                return get().userMe?.userRole === 'SUPER_ADMIN' || get().getUserGroupType() === 'DDTM';
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
