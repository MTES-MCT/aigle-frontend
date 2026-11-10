const BASE_API = '/api/';
const BASE_CONTROL_PLAN = `${BASE_API}control-plan/`;
const BASE_CONTROL_PLAN_WAVE = `${BASE_API}control-plan-wave/`;
const BASE_CONTROL_PLAN_PARCEL = `${BASE_API}control-plan-parcel/`;

export const controlPlanEndpoints = {
    list: BASE_CONTROL_PLAN,
    create: BASE_CONTROL_PLAN,
    detail: (uuid: string) => `${BASE_CONTROL_PLAN}${uuid}/`,
    close: (uuid: string) => `${BASE_CONTROL_PLAN}${uuid}/close/`,
    groups: `${BASE_CONTROL_PLAN}groups/`,
    prerequisites: `${BASE_CONTROL_PLAN}prerequisites/`,
    criteriaOptions: (uuid: string) => `${BASE_CONTROL_PLAN}${uuid}/criteria-options/`,
    eligibleCount: (uuid: string) => `${BASE_CONTROL_PLAN}${uuid}/eligible-count/`,
    outOfPlan: (uuid: string) => `${BASE_CONTROL_PLAN}${uuid}/out-of-plan/`,
};

export const controlPlanWaveEndpoints = {
    create: BASE_CONTROL_PLAN_WAVE,
    detail: (uuid: string) => `${BASE_CONTROL_PLAN_WAVE}${uuid}/`,
    validate: (uuid: string) => `${BASE_CONTROL_PLAN_WAVE}${uuid}/validate/`,
};

export const controlPlanParcelEndpoints = {
    list: BASE_CONTROL_PLAN_PARCEL,
    exclude: (uuid: string) => `${BASE_CONTROL_PLAN_PARCEL}${uuid}/exclude/`,
    restore: (uuid: string) => `${BASE_CONTROL_PLAN_PARCEL}${uuid}/restore/`,
    remove: (uuid: string) => `${BASE_CONTROL_PLAN_PARCEL}${uuid}/remove/`,
    preview: (uuid: string) => `${BASE_CONTROL_PLAN_PARCEL}${uuid}/preview/`,
};
