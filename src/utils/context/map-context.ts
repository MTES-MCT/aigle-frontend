import { detectionControlStatuses, DetectionValidationStatus } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { ObjectType } from '@/models/object-type';
import { TileSet, TileSetStatus, TileSetType } from '@/models/tile-set';
import { extractObjectTypesFromSettings } from '@/utils/context/utils';
import { format } from 'date-fns';
import EventEmitter from 'eventemitter3';
import { create } from 'zustand';

const getInitialLayers = (settings: MapSettings) => {
    const layers: MapTileSetLayer[] = [];
    const backgroundLayerYears: Set<string> = new Set();
    let layerYearDisplayed: string;

    settings.tileSetSettings.forEach(({ tileSet, geometry }) => {
        let displayed = false;

        if (tileSet.tileSetType !== 'BACKGROUND') {
            displayed = tileSet.tileSetStatus === 'VISIBLE';
        } else {
            const layerYear = format(tileSet.date, 'yyyy');
            backgroundLayerYears.add(layerYear);
            if (layerYearDisplayed) {
                displayed = layerYear === layerYearDisplayed;
            } else {
                displayed = true;
                layerYearDisplayed = layerYear;
            }
        }

        layers.push({
            tileSet: { ...tileSet, geometry },
            displayed,
        });
    });

    // sort years by descinding order
    let backgroundLayerYears_ = [...backgroundLayerYears];
    backgroundLayerYears_.sort();
    backgroundLayerYears_ = backgroundLayerYears_.reverse();

    return {
        layers,
        backgroundLayerYears: backgroundLayerYears_,
    };
};

type MapEventType = 'UPDATE_DETECTIONS' | 'UPDATE_DETECTION_DETAIL' | 'JUMP_TO' | 'DISPLAY_PARCEL' | 'LAYERS_UPDATED';

interface MapState {
    layers?: MapTileSetLayer[];
    backgroundLayerYears?: string[];
    customZoneLayers?: MapGeoCustomZoneLayer[];
    objectTypes?: ObjectType[];
    objectsFilter?: ObjectsFilter;
    settings?: MapSettings;
    userLastPosition?: GeoJSON.Position | null;
    annotationLayerVisible?: boolean;

    setMapSettings: (settings: MapSettings) => void;
    resetLayers: () => void;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    getDisplayedTileSetUrls: () => string[];
    setBackgroundTileSetYearDisplayed: (year: string) => void;
    setTileSetVisibility: (uuid: string, visible: boolean) => void;
    setTileSetsVisibility: (uuids: string[], visible: boolean) => void;
    setCustomZoneVisibility: (uuid: string, visible: boolean) => void;
    setAnnotationLayerVisibility: (visible: boolean) => void;
    getBackgroundTileSetYearDisplayed: () => string | undefined;
    getTileSets: (tileSetTypes: TileSetType[], tileSetStatuses: TileSetStatus[], displayed?: boolean) => TileSet[];
    getTileSetsUuids: (tileSetTypes: TileSetType[], tileSetStatuses: TileSetStatus[], displayed?: boolean) => string[];
    eventEmitter: EventEmitter<MapEventType>;
}

const useMap = create<MapState>()((set, get) => ({
    setMapSettings: (settings: MapSettings) => {
        const { allObjectTypes, objectTypesUuids } = extractObjectTypesFromSettings(settings);

        const { layers, backgroundLayerYears } = getInitialLayers(settings);

        set(() => ({
            settings,
            layers,
            backgroundLayerYears,
            annotationLayerVisible: false,
            customZoneLayers: settings.geoCustomZones.map((geoCustomZone) => ({
                geoCustomZone,
                displayed: false,
            })),
            objectTypes: allObjectTypes,
            objectsFilter: {
                objectTypesUuids: Array.from(objectTypesUuids),
                detectionValidationStatuses: ['DETECTED_NOT_VERIFIED', 'SUSPECT'] as DetectionValidationStatus[],
                detectionControlStatuses: detectionControlStatuses.filter((status) => status !== 'REHABILITATED'),
                score: 0.6,
                prescripted: false,
                interfaceDrawn: 'ALL',
                customZonesUuids: settings.geoCustomZones.map(({ uuid }) => uuid),
            },
            userLastPosition: settings.userLastPosition,
        }));
        document.documentElement.style.setProperty('--nbr-background-layers', backgroundLayerYears.length.toString());
    },
    setAnnotationLayerVisibility: (visible: boolean) => {
        set({
            annotationLayerVisible: visible,
        });
    },
    resetLayers: () => {
        const settings = get().settings;

        if (!settings) {
            return;
        }

        const { layers } = getInitialLayers(settings);

        set((state) => {
            state.eventEmitter.emit('LAYERS_UPDATED');
            return {
                layers,
            };
        });
    },
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => {
        set((state) => ({
            objectsFilter: {
                ...state.objectsFilter,
                ...objectsFilter,
            },
        }));
    },
    getDisplayedTileSetUrls: () => {
        return (get().layers || []).filter((layer) => layer.displayed).map((layer) => layer.tileSet.url);
    },
    setBackgroundTileSetYearDisplayed: (year: string) => {
        set((state) => {
            if (!state.layers) {
                return {};
            }

            state.layers.forEach((layer) => {
                if (layer.tileSet.tileSetType !== 'BACKGROUND') {
                    return;
                }

                layer.displayed = format(layer.tileSet.date, 'yyyy') === year;
            });

            state.eventEmitter.emit('LAYERS_UPDATED');
            return {
                layers: state.layers,
            };
        });
    },
    setTileSetsVisibility: (uuids: string[], visible: boolean) => {
        set((state) => {
            if (!state.layers) {
                return {};
            }

            const layerIndexes: number[] = [];
            let backgroundYearSet: string;

            state.layers.forEach((layer, index) => {
                if (uuids.includes(layer.tileSet.uuid)) {
                    if (layer.tileSet.tileSetType === 'BACKGROUND') {
                        const layerYear = format(layer.tileSet.date, 'yyyy');

                        if (backgroundYearSet && backgroundYearSet !== layerYear) {
                            throw new Error('Cannot set multiple background layers with different years');
                        }

                        (state.layers || []).forEach((lay) => {
                            if (lay.tileSet.tileSetType === 'BACKGROUND' && !uuids.includes(lay.tileSet.uuid)) {
                                lay.displayed = false;
                            }
                        });
                        backgroundYearSet = layerYear;
                    }

                    layerIndexes.push(index);
                }
            });

            layerIndexes.forEach((index) => {
                // @ts-expect-error TS18048
                state.layers[index].displayed = visible;
            });

            state.eventEmitter.emit('LAYERS_UPDATED');

            return {
                layers: state.layers,
            };
        });
    },
    setTileSetVisibility: (uuid: string, visible: boolean) => {
        set((state) => {
            if (!state.layers) {
                return {};
            }

            const layerIndex = state.layers.findIndex((layer) => layer.tileSet.uuid === uuid);

            if (layerIndex === -1) {
                return {};
            }

            if (state.layers[layerIndex].tileSet.tileSetType === 'BACKGROUND') {
                throw new Error(
                    'Cannot use this method to set background tileset visibility, use setBackgroundTileSetYearDisplayed instead',
                );
            }

            state.layers[layerIndex].displayed = visible;
            state.eventEmitter.emit('LAYERS_UPDATED');

            return {
                layers: state.layers,
            };
        });
    },
    setCustomZoneVisibility: (uuid: string, visible: boolean) => {
        set((state) => {
            if (!state.customZoneLayers) {
                return {};
            }

            const layerIndex = state.customZoneLayers.findIndex((layer) => layer.geoCustomZone.uuid === uuid);

            if (layerIndex === -1) {
                return {};
            }

            state.customZoneLayers[layerIndex].displayed = visible;

            return {
                customZoneLayers: state.customZoneLayers,
            };
        });
    },
    getBackgroundTileSetYearDisplayed: () => {
        const layers = get().layers || [];

        const firstBackgroundLayer = layers.find(
            (layer) => layer.displayed && layer.tileSet.tileSetType === 'BACKGROUND',
        );

        if (!firstBackgroundLayer) {
            return;
        }

        return format(firstBackgroundLayer.tileSet.date, 'yyyy');
    },
    getTileSets: (tileSetTypes: TileSetType[], tileSetStatuses: TileSetStatus[], displayed?: boolean) => {
        return (get().layers || [])
            .filter((layer) => {
                let condition =
                    tileSetTypes.includes(layer.tileSet.tileSetType) &&
                    tileSetStatuses.includes(layer.tileSet.tileSetStatus);

                if (displayed !== undefined) {
                    condition = condition && layer.displayed === displayed;
                }

                return condition;
            })
            .map((layer) => layer.tileSet);
    },
    getTileSetsUuids: (tileSetTypes: TileSetType[], tileSetStatuses: TileSetStatus[], displayed?: boolean) => {
        return get()
            .getTileSets(tileSetTypes, tileSetStatuses, displayed)
            .map((tileSet) => tileSet.uuid);
    },
    eventEmitter: new EventEmitter<MapEventType>(),
}));

export { useMap };
