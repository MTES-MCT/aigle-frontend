const BASE_API = '/api/';
const BASE_UTILS = `${BASE_API}utils/`;
const BASE_PARCEL = `${BASE_API}parcel/`;

export const mapEndpoints = {
    settings: `${BASE_API}map-settings/`,
};

export const parcelEndpoints = {
    list: BASE_PARCEL,
    detail: (uuid: string) => `${BASE_PARCEL}${uuid}/`,
    downloadInfos: (uuid: string) => `${BASE_PARCEL}${uuid}/get_download_infos/`,
    suggestSection: `${BASE_PARCEL}suggest_section/`,
    suggestNumParcel: `${BASE_PARCEL}suggest_num_parcel/`,
    listItems: `${BASE_PARCEL}list_items/`,
    overview: `${BASE_PARCEL}overview/`,
};

export const utilsEndpoints = {
    customGeometry: `${BASE_UTILS}get-custom-geometry/`,
    annotationGrid: `${BASE_UTILS}get-annotation-grid/`,
    generatePriorLetter: (detectionObjectUuid: string) => `${BASE_UTILS}generate-prior-letter/${detectionObjectUuid}/`,
};
