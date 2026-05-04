const BASE_API = '/api/';
const BASE_USERS = `${BASE_API}users/`;

export const usersEndpoints = {
    list: BASE_USERS,
    create: BASE_USERS,
    me: `${BASE_USERS}me/`,
    detail: (uuid: string) => `${BASE_USERS}${uuid}/`,
    export: `${BASE_USERS}export/`,
    bulkImportPreview: `${BASE_USERS}bulk-import-preview/`,
    bulkImport: `${BASE_USERS}bulk-import/`,
};

const BASE_USER_GROUP = `${BASE_API}user-group/`;

export const userGroupEndpoints = {
    list: BASE_USER_GROUP,
    create: BASE_USER_GROUP,
    detail: (uuid: string) => `${BASE_USER_GROUP}${uuid}/`,
    export: `${BASE_USER_GROUP}export/`,
    bulkImportPreview: `${BASE_USER_GROUP}bulk-import-preview/`,
    bulkImport: `${BASE_USER_GROUP}bulk-import/`,
};
