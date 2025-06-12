const BASE_API = '/api/';
const BASE_USERS = `${BASE_API}users/`;

export const usersEndpoints = {
    list: BASE_USERS,
    create: BASE_USERS,
    me: `${BASE_USERS}me/`,
    detail: (uuid: string) => `${BASE_USERS}${uuid}/`,
};

const BASE_USER_GROUP = `${BASE_API}user-group/`;

export const userGroupEndpoints = {
    list: BASE_USER_GROUP,
    create: BASE_USER_GROUP,
    detail: (uuid: string) => `${BASE_USER_GROUP}${uuid}/`,
};
