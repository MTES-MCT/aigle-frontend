import { DownloadOutputFormat } from '../types';

const BASE_API = '/api/';
const BASE_DETECTION = `${BASE_API}detection/`;
const BASE_DETECTION_OBJECT = `${BASE_API}detection-object/`;
const BASE_DETECTION_DATA = `${BASE_API}detection-data/`;

export const detectionEndpoints = {
    create: BASE_DETECTION,
    list: `${BASE_API}detection-list/`,
    listOverview: `${BASE_API}detection-list/overview/`,
    multiple: `${BASE_DETECTION}multiple/`,
    detail: (uuid: string) => `${BASE_DETECTION}${uuid}/`,
    forceVisible: (uuid: string) => `${BASE_DETECTION}${uuid}/force-visible/`,
    download: (outputFormat: DownloadOutputFormat) => {
        const searchParams = new URLSearchParams();
        searchParams.set('outputFormat', outputFormat);
        return `${BASE_API}detection-list/download/?${searchParams.toString()}`;
    },
    getList: (detail: boolean = false, geoFeature: boolean = false) => {
        const searchParams = new URLSearchParams();

        if (detail) {
            searchParams.set('detail', 'true');
        }

        let base: string;

        if (geoFeature) {
            base = BASE_DETECTION;
            searchParams.set('geoFeature', 'true');
        } else {
            base = `${BASE_API}detection-list/`;
        }

        return `${base}?${searchParams.toString()}`;
    },
};

export const detectionObjectEndpoints = {
    list: BASE_DETECTION_OBJECT,
    create: BASE_DETECTION_OBJECT,
    detail: (uuid: string) => `${BASE_DETECTION_OBJECT}${uuid}/`,
    history: (uuid: string) => `${BASE_DETECTION_OBJECT}${uuid}/history/`,
    fromCoordinates: `${BASE_DETECTION_OBJECT}from-coordinates/`,
};

export const detectionDataEndpoints = {
    create: BASE_DETECTION_DATA,
    detail: (uuid: string) => `${BASE_DETECTION_DATA}${uuid}/`,
};
