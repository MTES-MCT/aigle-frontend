const BASE_API = '/api/';

const BASE_OBJECT_TYPE = `${BASE_API}object-type/`;
const BASE_OBJECT_TYPE_CATEGORY = `${BASE_API}object-type-category/`;
const BASE_TILE_SET = `${BASE_API}tile-set/`;
const BASE_RUN_COMMAND = `${BASE_API}run-command/`;

export const objectTypeEndpoints = {
    list: BASE_OBJECT_TYPE,
    create: BASE_OBJECT_TYPE,
    detail: (uuid: string) => `${BASE_OBJECT_TYPE}${uuid}/`,
};

export const objectTypeCategoryEndpoints = {
    list: BASE_OBJECT_TYPE_CATEGORY,
    create: BASE_OBJECT_TYPE_CATEGORY,
    detail: (uuid: string) => `${BASE_OBJECT_TYPE_CATEGORY}${uuid}/`,
};

export const tileSetEndpoints = {
    list: BASE_TILE_SET,
    create: BASE_TILE_SET,
    detail: (uuid: string) => `${BASE_TILE_SET}${uuid}/`,
    lastFromCoordinates: `${BASE_TILE_SET}last-from-coordinates/`,
};

export const runCommandEndpoints = {
    list: BASE_RUN_COMMAND,
    run: `${BASE_RUN_COMMAND}run/`,
    tasks: `${BASE_RUN_COMMAND}tasks/`,
    cancel: (taskId: string) => `${BASE_TILE_SET}/cancel/${taskId}/`,
};
