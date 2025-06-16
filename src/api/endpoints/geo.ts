import { CollectivityType } from '@/models/geo/_common';

const BASE_API = '/api/';
const BASE_GEO = `${BASE_API}geo/`;

const BASE_GEO_REGION = `${BASE_GEO}region/`;
const BASE_GEO_DEPARTMENT = `${BASE_GEO}department/`;
const BASE_GEO_COMMUNE = `${BASE_GEO}commune/`;

export const geoEndpoints = {
    region: {
        list: BASE_GEO_REGION,
        create: BASE_GEO_REGION,
        detail: (uuid: string) => `${BASE_GEO_REGION}${uuid}/`,
    },
    department: {
        list: BASE_GEO_DEPARTMENT,
        create: BASE_GEO_DEPARTMENT,
        detail: (uuid: string) => `${BASE_GEO_DEPARTMENT}${uuid}/`,
    },
    commune: {
        list: BASE_GEO_COMMUNE,
        create: BASE_GEO_COMMUNE,
        detail: (uuid: string) => `${BASE_GEO_COMMUNE}${uuid}/`,
    },
};

export const getGeoListEndpoint = (collectivityType: CollectivityType) => {
    switch (collectivityType) {
        case 'region':
            return geoEndpoints.region.list;
        case 'department':
            return geoEndpoints.department.list;
        case 'commune':
            return geoEndpoints.commune.list;
        default:
            throw new Error(`Unknown collectivity type ${collectivityType}`);
    }
};

export const getGeoCreateEndpoint = (collectivityType: CollectivityType) => {
    switch (collectivityType) {
        case 'region':
            return geoEndpoints.region.create;
        case 'department':
            return geoEndpoints.department.create;
        case 'commune':
            return geoEndpoints.commune.create;
        default:
            throw new Error(`Unknown collectivity type ${collectivityType}`);
    }
};

export const getGeoDetailEndpoint = (collectivityType: CollectivityType, uuid: string) => {
    switch (collectivityType) {
        case 'region':
            return geoEndpoints.region.detail(uuid);
        case 'department':
            return geoEndpoints.department.detail(uuid);
        case 'commune':
            return geoEndpoints.commune.detail(uuid);
        default:
            throw new Error(`Unknown collectivity type ${collectivityType}`);
    }
};

const BASE_GEO_CUSTOM_ZONE = `${BASE_GEO}custom-zone/`;
const BASE_GEO_CUSTOM_ZONE_CATEGORY = `${BASE_GEO}custom-zone-category/`;

export const customZoneEndpoints = {
    list: BASE_GEO_CUSTOM_ZONE,
    create: BASE_GEO_CUSTOM_ZONE,
    detail: (uuid: string) => `${BASE_GEO_CUSTOM_ZONE}${uuid}/`,
    category: {
        list: BASE_GEO_CUSTOM_ZONE_CATEGORY,
        create: BASE_GEO_CUSTOM_ZONE_CATEGORY,
        detail: (uuid: string) => `${BASE_GEO_CUSTOM_ZONE_CATEGORY}${uuid}/`,
    },
};
