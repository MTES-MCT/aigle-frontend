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
    visibleObjectTypesUuids?: Set<string>;
    geoCustomZones?: GeoCustomZone[];
    otherObjectTypesUuids?: Set<string>;
    customZoneLayers?: MapGeoCustomZoneLayer[];

    setMapSettings: (settings: MapSettings, canAccessControlPlan: boolean) => void;
}

const useStatistics = create<StatisticsState>()((set) => ({
    setMapSettings: (settings: MapSettings, canAccessControlPlan: boolean) => {
        const layers = getInitialStatisticsLayers(settings);
        const {
            allObjectTypes,
            visibleObjectTypesUuids,
            otherObjectTypesUuids,
            initialMapGeoCustomZoneLayers,
            objectsFilter,
        } = getCommonMapSettingsData(settings, canAccessControlPlan);

        useObjectsFilter.getState().updateObjectsFilter(objectsFilter);

        set(() => ({
            layers,
            allObjectTypes,
            visibleObjectTypesUuids,
            geoCustomZones: settings.geoCustomZonesUncategorized,
            otherObjectTypesUuids: otherObjectTypesUuids,
            customZoneLayers: initialMapGeoCustomZoneLayers,
        }));
    },
}));

export { useStatistics };
