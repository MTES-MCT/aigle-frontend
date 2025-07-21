import { ObjectsFilter } from '@/models/detection-filter';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { getCommonMapSettingsData, getInitialStatisticsLayers } from '@/store/utils';
import { create } from 'zustand';

interface ZonesFilter {
    tileSetsUuids: string[];
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

interface StatisticsState {
    layers?: MapTileSetLayer[];
    objectsFilter?: ObjectsFilter;
    allObjectTypes?: ObjectType[];
    geoCustomZones?: GeoCustomZone[];
    zonesFilter?: ZonesFilter;
    otherObjectTypesUuids?: Set<string>;
    customZoneLayers?: MapGeoCustomZoneLayer[];

    setMapSettings: (settings: MapSettings) => void;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    updateZonesFilter: (zonesFilter: ZonesFilter) => void;
}

const useStatistics = create<StatisticsState>()((set) => ({
    setMapSettings: (settings: MapSettings) => {
        const layers = getInitialStatisticsLayers(settings);
        const { allObjectTypes, otherObjectTypesUuids, initialMapGeoCustomZoneLayers, objectsFilter } =
            getCommonMapSettingsData(settings);

        set(() => ({
            layers,
            allObjectTypes,
            geoCustomZones: settings.geoCustomZonesUncategorized,
            objectsFilter: objectsFilter,
            zonesFilter: {
                tileSetsUuids: [],
                communesUuids: [],
                departmentsUuids: [],
                regionsUuids: [],
            },
            userLastPosition: settings.userLastPosition,
            otherObjectTypesUuids: otherObjectTypesUuids,
            customZoneLayers: initialMapGeoCustomZoneLayers,
        }));
    },
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => {
        set((state) => ({
            objectsFilter: {
                ...state.objectsFilter,
                ...objectsFilter,
            },
        }));
    },
    updateZonesFilter: (zonesFilter: ZonesFilter) => {
        set((state) => ({
            zonesFilter: {
                ...state.zonesFilter,
                ...zonesFilter,
            },
        }));
    },
}));

export { useStatistics };
