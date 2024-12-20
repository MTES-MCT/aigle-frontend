import { detectionControlStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { extractObjectTypesFromSettings } from '@/utils/context/utils';
import { create } from 'zustand';

const getInitialLayers = (settings: MapSettings) => {
    const layers: MapTileSetLayer[] = [];

    settings.tileSetSettings.forEach(({ tileSet, geometry }) => {
        let displayed = false;

        if (tileSet.tileSetType === 'INDICATIVE') {
            return;
        }

        displayed = tileSet.tileSetStatus === 'VISIBLE';

        layers.push({
            tileSet: { ...tileSet, geometry },
            displayed,
        });
    });

    return layers;
};

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

    setMapSettings: (settings: MapSettings) => void;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    updateZonesFilter: (zonesFilter: ZonesFilter) => void;
}

const useStatistics = create<StatisticsState>()((set) => ({
    setMapSettings: (settings: MapSettings) => {
        const { allObjectTypes, objectTypesUuids } = extractObjectTypesFromSettings(settings);
        const layers = getInitialLayers(settings);

        set(() => ({
            layers,
            allObjectTypes,
            geoCustomZones: settings.geoCustomZones,
            objectsFilter: {
                objectTypesUuids: Array.from(objectTypesUuids),
                detectionValidationStatuses: ['DETECTED_NOT_VERIFIED', 'SUSPECT'],
                detectionControlStatuses: [...detectionControlStatuses],
                score: 0.3,
                prescripted: null,
                interfaceDrawn: 'ALL',
                customZonesUuids: settings.geoCustomZones.map(({ uuid }) => uuid),
            },
            zonesFilter: {
                tileSetsUuids: [],
                communesUuids: [],
                departmentsUuids: [],
                regionsUuids: [],
            },
            userLastPosition: settings.userLastPosition,
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
