export * from '../types';
export * from './admin';
export * from './auth';
export * from './detection';
export * from './geo';
export * from './users';
export * from './utils';

// Legacy exports for backward compatibility
export {
    objectTypeCategoryEndpoints as OBJECT_TYPE_CATEGORY_ENDPOINTS,
    objectTypeEndpoints as OBJECT_TYPE_ENDPOINTS,
    runCommandEndpoints as RUN_COMMAND_ENDPOINTS,
    tileSetEndpoints as TILE_SET_ENDPOINTS,
} from './admin';
export { authEndpoints as AUTH_ENDPOINTS } from './auth';
export {
    detectionDataEndpoints as DETECTION_DATA_ENDPOINTS,
    detectionEndpoints as DETECTION_ENDPOINTS,
    detectionObjectEndpoints as DETECTION_OBJECT_ENDPOINTS,
} from './detection';
export { customZoneEndpoints as CUSTOM_ZONE_ENDPOINTS, geoEndpoints as GEO_ENDPOINTS } from './geo';
export { usersEndpoints as USERS_ENDPOINTS, userGroupEndpoints as USER_GROUP_ENDPOINTS } from './users';
export {
    mapEndpoints as MAP_ENDPOINTS,
    parcelEndpoints as PARCEL_ENDPOINTS,
    statisticsEndpoints as STATISTICS_ENDPOINTS,
    utilsEndpoints as UTILS_ENDPOINTS,
} from './utils';

// Re-export individual functions for backward compatibility
export { getGeoCreateEndpoint, getGeoDetailEndpoint, getGeoListEndpoint } from './geo';
