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

interface StatisticsState {
    layers?: MapTileSetLayer[];
    objectsFilter?: ObjectsFilter;
    allObjectTypes?: ObjectType[];
    geoCustomZones?: GeoCustomZone[];

    setMapSettings: (settings: MapSettings) => void;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

const useStatistics = create<StatisticsState>()((set, get) => ({
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
                score: 0.6,
                prescripted: null,
                interfaceDrawn: 'ALL',
                customZonesUuids: settings.geoCustomZones.map(({ uuid }) => uuid),
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
}));

export { useStatistics };
