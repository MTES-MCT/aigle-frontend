const BASE_API = '/api/';
const BASE_HELP_CENTER = `${BASE_API}help-center/`;
const BASE_WEBINAR = `${BASE_HELP_CENTER}webinar/`;

export const helpCenterEndpoints = {
    pathValidation: `${BASE_HELP_CENTER}path-validation/`,
};

export const webinarEndpoints = {
    list: BASE_WEBINAR,
    create: BASE_WEBINAR,
    detail: (uuid: string) => `${BASE_WEBINAR}${uuid}/`,
};
