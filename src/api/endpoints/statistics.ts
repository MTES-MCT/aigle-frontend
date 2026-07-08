const BASE_API = '/api/';

const BASE_DDTM_ACTIVITY = `${BASE_API}statistics/ddtm-activity/`;

export const ddtmActivityEndpoints = {
    summary: BASE_DDTM_ACTIVITY,
    userGroups: `${BASE_DDTM_ACTIVITY}user-groups/`,
    // Department-wide per-group activity chart (accepts ?granularity=).
    groupsActivity: `${BASE_DDTM_ACTIVITY}groups-activity/`,
    userGroupUsers: (uuid: string) => `${BASE_DDTM_ACTIVITY}user-group/${uuid}/users/`,
    // One group's per-period charts (accepts ?granularity=).
    userGroupActivity: (uuid: string) => `${BASE_DDTM_ACTIVITY}user-group/${uuid}/`,
};
