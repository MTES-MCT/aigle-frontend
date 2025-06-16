// DEPRECATED: This file is maintained for backward compatibility.
// Use the new API structure in @/api/endpoints/ instead.

import {
    authEndpoints,
    customZoneEndpoints,
    detectionDataEndpoints,
    detectionEndpoints,
    detectionObjectEndpoints,
    geoEndpoints,
    getGeoCreateEndpoint,
    getGeoDetailEndpoint,
    getGeoListEndpoint,
    mapEndpoints,
    objectTypeCategoryEndpoints,
    objectTypeEndpoints,
    parcelEndpoints,
    runCommandEndpoints,
    statisticsEndpoints,
    tileSetEndpoints,
    userGroupEndpoints,
    usersEndpoints,
    utilsEndpoints,
    type DownloadOutputFormat,
} from '@/api/endpoints';

// Auth endpoints
export const AUTH_REGISTER_ENDPOINT = authEndpoints.register;
export const AUTH_LOGIN_ENDPOINT = authEndpoints.login;
export const AUTH_REFRESH_TOKEN_ENDPOINT = authEndpoints.refreshToken;
export const AUTH_RESET_PASSWORD_ENDPOINT = authEndpoints.resetPassword;
export const AUTH_RESET_PASSWORD_CONFIRM_ENDPOINT = authEndpoints.resetPasswordConfirm;

// User endpoints
export const USERS_LIST_ENDPOINT = usersEndpoints.list;
export const USERS_POST_ENDPOINT = usersEndpoints.create;
export const USERS_ME_ENDPOINT = usersEndpoints.me;
export const getUserDetailEndpoint = usersEndpoints.detail;

// User group endpoints
export const USER_GROUP_LIST_ENDPOINT = userGroupEndpoints.list;
export const USER_GROUP_POST_ENDPOINT = userGroupEndpoints.create;
export const getUserGroupDetailEndpoint = userGroupEndpoints.detail;

// Run command endpoints
export const RUN_COMMAND_LIST_ENDPOINT = runCommandEndpoints.list;
export const RUN_COMMAND_RUN_ENDPOINT = runCommandEndpoints.run;
export const RUN_COMMAND_TASKS_ENDPOINT = runCommandEndpoints.tasks;

// Geo endpoints
export const GEO_REGION_LIST_ENDPOINT = geoEndpoints.region.list;
export const GEO_REGION_POST_ENDPOINT = geoEndpoints.region.create;
export const getGeoRegionDetailEndpoint = geoEndpoints.region.detail;

export const GEO_DEPARTMENT_LIST_ENDPOINT = geoEndpoints.department.list;
export const GEO_DEPARTMENT_POST_ENDPOINT = geoEndpoints.department.create;
export const getGeoDepartmentDetailEndpoint = geoEndpoints.department.detail;

export const GEO_COMMUNE_LIST_ENDPOINT = geoEndpoints.commune.list;
export const GEO_COMMUNE_POST_ENDPOINT = geoEndpoints.commune.create;
export const getGeoCommuneDetailEndpoint = geoEndpoints.commune.detail;

// Custom zone endpoints
export const GEO_CUSTOM_ZONE_LIST_ENDPOINT = customZoneEndpoints.list;
export const GEO_CUSTOM_ZONE_POST_ENDPOINT = customZoneEndpoints.create;
export const getGeoCustomZoneDetailEndpoint = customZoneEndpoints.detail;

export const GEO_CUSTOM_ZONE_CATEGORY_LIST_ENDPOINT = customZoneEndpoints.category.list;
export const GEO_CUSTOM_ZONE_CATEGORY_POST_ENDPOINT = customZoneEndpoints.category.create;
export const getGeoCustomZoneCategoryDetailEndpoint = customZoneEndpoints.category.detail;

// Object type endpoints
export const OBJECT_TYPE_LIST_ENDPOINT = objectTypeEndpoints.list;
export const OBJECT_TYPE_POST_ENDPOINT = objectTypeEndpoints.create;
export const getObjectTypeDetailEndpoint = objectTypeEndpoints.detail;

export const OBJECT_TYPE_CATEGORY_LIST_ENDPOINT = objectTypeCategoryEndpoints.list;
export const OBJECT_TYPE_CATEGORY_POST_ENDPOINT = objectTypeCategoryEndpoints.create;
export const getObjectTypeCategoryDetailEndpoint = objectTypeCategoryEndpoints.detail;

// Tile set endpoints
export const TILE_SET_LIST_ENDPOINT = tileSetEndpoints.list;
export const TILE_SET_POST_ENDPOINT = tileSetEndpoints.create;
export const TILE_SET_LAST_FROM_COORDINATES_ENDPOINT = tileSetEndpoints.lastFromCoordinates;
export const getTileSetDetailEndpoint = tileSetEndpoints.detail;

// Map endpoints
export const MAP_SETTINGS_ENDPOINT = mapEndpoints.settings;

// Detection endpoints
export const DETECTION_POST_ENDPOINT = detectionEndpoints.create;
export const DETECTION_LIST_ENDPOINT = detectionEndpoints.list;
export const DETECTION_LIST_OVERVIEW_ENDPOINT = detectionEndpoints.listOverview;
export const DETECTION_MULTIPLE_POST_ENDPOINT = detectionEndpoints.multiple;
export const getDetectionDetailEndpoint = detectionEndpoints.detail;
export const getDetectionForceVisibleEndpoint = detectionEndpoints.forceVisible;
export const getDetectionListDownloadEndpoint = detectionEndpoints.download;
export const getDetectionListEndpoint = detectionEndpoints.getList;

// Detection object endpoints
export const DETECTION_OBJECT_LIST_ENDPOINT = detectionObjectEndpoints.list;
export const DETECTION_OBJECT_POST_ENDPOINT = detectionObjectEndpoints.create;
export const getDetectionObjectDetailEndpoint = detectionObjectEndpoints.detail;
export const getDetectionObjectHistoryEndpoint = detectionObjectEndpoints.history;
export const DETECTION_OBJECT_FROM_COORDINATES_ENDPOINT = detectionObjectEndpoints.fromCoordinates;

// Detection data endpoints
export const DETECTION_DATA_POST_ENDPOINT = detectionDataEndpoints.create;
export const getDetectionDataDetailEndpoint = detectionDataEndpoints.detail;

// Parcel endpoints
export const PARCEL_LIST_ENDPOINT = parcelEndpoints.list;
export const getDetectionParcelDetailEndpoint = parcelEndpoints.detail;
export const getParcelDownloadInfosEndpoint = parcelEndpoints.downloadInfos;
export const PARCEL_SUGGEST_SECTION_ENDPOINT = parcelEndpoints.suggestSection;
export const PARCEL_SUGGEST_NUM_PARCEL_ENDPOINT = parcelEndpoints.suggestNumParcel;

// Utils endpoints
export const IMPORTS_INFOS_ENDPOINT = utilsEndpoints.importsInfos;
export const GET_CUSTOM_GEOMETRY_ENDPOINT = utilsEndpoints.customGeometry;
export const GET_ANNOTATION_GRID_ENDPOINT = utilsEndpoints.annotationGrid;
export const getGeneratePriorLetterEndpoint = utilsEndpoints.generatePriorLetter;

// Statistics endpoints
export const STATISTICS_VALIDATION_STATUS_EVOLUTION_ENDPOINT = statisticsEndpoints.validationStatusEvolution;
export const STATISTICS_VALIDATION_STATUS_GLOBAL_ENDPOINT = statisticsEndpoints.validationStatusGlobal;
export const STATISTICS_VALIDATION_STATUS_OBJECT_TYPES_GLOBAL_ENDPOINT =
    statisticsEndpoints.validationStatusObjectTypesGlobal;

// Legacy function exports
export { getGeoDetailEndpoint, getGeoListEndpoint, getGeoCreateEndpoint as getGeoPostEndpoint };
export type { DownloadOutputFormat };
