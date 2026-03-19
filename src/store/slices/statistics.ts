import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { useObjectsFilter } from '@/store/slices/objects-filter';
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
    allObjectTypes?: ObjectType[];
    geoCustomZones?: GeoCustomZone[];
    zonesFilter?: ZonesFilter;
    otherObjectTypesUuids?: Set<string>;
    customZoneLayers?: MapGeoCustomZoneLayer[];

    setMapSettings: (settings: MapSettings) => void;
    updateZonesFilter: (zonesFilter: ZonesFilter) => void;
}

const useStatistics = create<StatisticsState>()((set) => ({
    setMapSettings: (settings: MapSettings) => {
        const layers = getInitialStatisticsLayers(settings);
        const { allObjectTypes, otherObjectTypesUuids, initialMapGeoCustomZoneLayers, objectsFilter } =
            getCommonMapSettingsData(settings);

        useObjectsFilter.getState().updateObjectsFilter(objectsFilter);

        set(() => ({
            layers,
            allObjectTypes,
            geoCustomZones: settings.geoCustomZonesUncategorized,
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
