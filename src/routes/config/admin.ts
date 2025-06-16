import CollectiviteForm from '@/routes/admin/collectivite/CollectiviteForm';
import CollectiviteList from '@/routes/admin/collectivite/CollectiviteList';
import CustomZoneCategoryForm from '@/routes/admin/custom-zone/CustomZoneCategoryForm';
import CustomZoneForm from '@/routes/admin/custom-zone/CustomZoneForm';
import CustomZoneList from '@/routes/admin/custom-zone/CustomZoneList';
import ImportsPage from '@/routes/admin/imports';
import ObjectTypeCategoryForm from '@/routes/admin/object-type-category/ObjectTypeCategoryForm';
import ObjectTypeCategoryList from '@/routes/admin/object-type-category/ObjectTypeCategoryList';
import ObjectTypeForm from '@/routes/admin/object-type/ObjectTypeForm';
import ObjectTypeList from '@/routes/admin/object-type/ObjectTypeList';
import RunCommand from '@/routes/admin/run-command';
import TileSetForm from '@/routes/admin/tile-set/TileSetForm';
import TileSetList from '@/routes/admin/tile-set/TileSetList';
import UserGroupForm from '@/routes/admin/user-group/UserGroupForm';
import UserGroupList from '@/routes/admin/user-group/UserGroupList';
import UserForm from '@/routes/admin/user/UserForm';
import UserList from '@/routes/admin/user/UserList';
import { RouteGroup } from './types';

export const adminRoutes: RouteGroup = {
    name: 'admin',
    routes: [
        // User Management
        {
            path: '/admin/users',
            component: UserList,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/users/form',
            component: UserForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/users/form/:uuid',
            component: UserForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },

        // User Groups - Super Admin Only
        {
            path: '/admin/user-groups',
            component: UserGroupList,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/user-groups/form',
            component: UserGroupForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/user-groups/form/:uuid',
            component: UserGroupForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Custom Zones
        {
            path: '/admin/custom-zones',
            component: CustomZoneList,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/custom-zones/form',
            component: CustomZoneForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/custom-zones/form/:uuid',
            component: CustomZoneForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/custom-zones/category-form',
            component: CustomZoneCategoryForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/custom-zones/category-form/:uuid',
            component: CustomZoneCategoryForm,
            roles: ['ADMIN', 'SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Collectivites - Super Admin Only
        {
            path: '/admin/collectivites',
            component: CollectiviteList,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/collectivites/:collectivityType/form/:uuid',
            component: CollectiviteForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Object Types - Super Admin Only
        {
            path: '/admin/object-types',
            component: ObjectTypeList,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/object-types/form',
            component: ObjectTypeForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/object-types/form/:uuid',
            component: ObjectTypeForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Object Type Categories - Super Admin Only
        {
            path: '/admin/object-type-categories',
            component: ObjectTypeCategoryList,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/object-type-categories/form',
            component: ObjectTypeCategoryForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/object-type-categories/form/:uuid',
            component: ObjectTypeCategoryForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Tile Sets - Super Admin Only
        {
            path: '/admin/tile-sets',
            component: TileSetList,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/tile-sets/form',
            component: TileSetForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
        {
            path: '/admin/tile-sets/form/:uuid',
            component: TileSetForm,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Imports - Super Admin Only
        {
            path: '/admin/imports',
            component: ImportsPage,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },

        // Run Command - Super Admin Only
        {
            path: '/admin/run-command',
            component: RunCommand,
            roles: ['SUPER_ADMIN'],
            requiresAuth: true,
        },
    ],
};
