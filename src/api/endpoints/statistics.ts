const BASE_API = '/api/';

const BASE_DDTM_ACTIVITY = `${BASE_API}statistics/ddtm-activity/`;

export const ddtmActivityEndpoints = {
    summary: BASE_DDTM_ACTIVITY,
    userGroups: `${BASE_DDTM_ACTIVITY}user-groups/`,
    userGroupUsers: (uuid: string) => `${BASE_DDTM_ACTIVITY}user-group/${uuid}/users/`,
    userGroupMonthly: (uuid: string) => `${BASE_DDTM_ACTIVITY}user-group/${uuid}/`,
};
