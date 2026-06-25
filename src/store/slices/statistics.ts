import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { getCommonMapSettingsData, getInitialStatisticsLayers } from '@/store/utils';
import { create } from 'zustand';

interface StatisticsState {
    layers?: MapTileSetLayer[];
    allObjectTypes?: ObjectType[];
    geoCustomZones?: GeoCustomZone[];
    otherObjectTypesUuids?: Set<string>;
    customZoneLayers?: MapGeoCustomZoneLayer[];

    setMapSettings: (settings: MapSettings) => void;
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
            otherObjectTypesUuids: otherObjectTypesUuids,
            customZoneLayers: initialMapGeoCustomZoneLayers,
        }));
    },
}));

export { useStatistics };
