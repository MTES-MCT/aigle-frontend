import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { GeolocateControl, Layer, MapRef, Source, ViewStateChangeEvent } from 'react-map-gl';

import { detectionEndpoints, detectionObjectEndpoints, utilsEndpoints } from '@/api/endpoints';
import DetectionDetail from '@/components/DetectionDetail';
import EditMultipleDetectionsModal from '@/components/EditMultipleDetectionsModal';
import MapAddAnnotationModal from '@/components/Map/MapAddAnnotationModal';
import MapSidePanel, { MapSidePanelSection } from '@/components/Map/MapSidePanel';
import MapControlBackgroundSlider from '@/components/Map/controls/MapControlBackgroundSlider';
import MapControlLegend from '@/components/Map/controls/MapControlLegend';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import { processDetections } from '@/components/Map/utils/process-detections';
import SignalementPDFData from '@/components/signalement-pdf/SignalementPDFData';
import { DetectionGeojsonData, DetectionProperties } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { DetectionObjectDetail } from '@/models/detection-object';
import { GeoCustomZoneResponse } from '@/models/geo/geo-custom-zone';
import { MapTileSetLayer } from '@/models/map-layer';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import api, { ApiError } from '@/utils/api';
import { getCustomZoneOpacities } from '@/utils/colors';
import {
    CUSTOM_ZONE_NEGATIVE_COLOR,
    CUSTOM_ZONE_NEGATIVE_OPACITY,
    DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
    MAPBOX_TOKEN,
    PARCEL_COLOR,
} from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { getViewStateFromUrl, setViewStateInUrl } from '@/utils/map-url';
import { Button, LoadingOverlay, Loader as MantineLoader, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { IconCancel } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { bbox, bboxPolygon, booleanIntersects, centroid, feature, featureCollection, getCoord } from '@turf/turf';
import { FeatureCollection, Polygon } from 'geojson';
import mapboxgl, { DataDrivenPropertyValueSpecification } from 'mapbox-gl';
import DrawRectangle, { DrawStyles } from 'mapbox-gl-draw-rectangle-restrict-area';
import classes from './index.module.scss';

const ZOOM_LIMIT_TO_DISPLAY_DETECTIONS = 9;
const ZOOM_LIMIT_TO_DISPLAY_ANNOTATION_GRID = 13;

const getMapInitialViewState = (
    initialPosition?: GeoJSON.Position | null,
    initialDetectionObjectUuid?: string,
    urlViewState?: { latitude: number; longitude: number; zoom: number } | null,
) => ({
    longitude: 3.95657,
    latitude: 43.61951,
    zoom: 16,
    // detections are north-up rectangles: lock bearing/pitch so the map can't render tilted
    bearing: 0,
    pitch: 0,
    ...(initialDetectionObjectUuid
        ? {
              zoom: 19,
              padding: MAP_PADDINGS.detailSectionShowed,
          }
        : {}),
    ...(urlViewState
        ? {
              longitude: urlViewState.longitude,
              latitude: urlViewState.latitude,
              zoom: urlViewState.zoom,
          }
        : initialPosition
          ? { longitude: initialPosition[0], latitude: initialPosition[1] }
          : {}),
});

type DrawMode = 'MULTIPLE_EDIT' | 'ADD_DETECTION' | 'MULTIPLE_DOWNLOAD';

// Each toolbar button always enters its own built-in mode name. Remapping the behaviour
// onto those names (instead of calling changeMode() after the fact) is what keeps
// mapbox-gl-draw highlighting the button the user actually pressed, and what makes
// clicking that same button again cancel the draw.
const DRAW_MODE_ADD_DETECTION = 'draw_point';
const DRAW_MODE_MULTIPLE_DOWNLOAD = 'draw_line_string';
const DRAW_MODE_MULTIPLE_EDIT = 'draw_polygon';

const DRAW_MODES_MAP: Record<string, DrawMode> = {
    [DRAW_MODE_ADD_DETECTION]: 'ADD_DETECTION',
    [DRAW_MODE_MULTIPLE_DOWNLOAD]: 'MULTIPLE_DOWNLOAD',
    [DRAW_MODE_MULTIPLE_EDIT]: 'MULTIPLE_EDIT',
};

const DRAW_MODE_TITLES_MAP: Record<DrawMode, string> = {
    MULTIPLE_EDIT: 'Edition multiple',
    ADD_DETECTION: 'Dessiner un objet',
    MULTIPLE_DOWNLOAD: 'Téléchargement multiple de rapports',
};

// mapbox-gl-draw modes highlight a button from their own onSetup, so a mode reused under
// another button's name would light up the wrong one
const withActiveButton = (
    mode: MapboxDraw.DrawCustomMode,
    buttonType: string,
    defaultOptions: Record<string, unknown> = {},
): MapboxDraw.DrawCustomMode => ({
    ...mode,
    onSetup(options) {
        const state = mode.onSetup?.call(this, { ...defaultOptions, ...options });
        this.activateUIButton(buttonType);
        return state;
    },
});

// one instance per map: mapbox-gl-draw nulls its own context on removal, so a shared
// instance silently follows whichever map added it last
const buildDrawControl = () =>
    new MapboxDraw({
        userProperties: true,
        displayControlsDefault: false,
        // without this, pressing 1/2/3 anywhere on the map silently enters a draw mode.
        // It also takes the modes' own Escape handling down with it, which the component
        // reimplements (see cancelDraw).
        keybindings: false,
        styles: DrawStyles,
        modes: {
            ...MapboxDraw.modes,
            [DRAW_MODE_ADD_DETECTION]: withActiveButton(
                DrawRectangle as MapboxDraw.DrawCustomMode,
                MapboxDraw.constants.types.POINT,
                {
                    allowCreateExceeded: false,
                    exceedCallsOnEachMove: false,
                },
            ),
            [DRAW_MODE_MULTIPLE_DOWNLOAD]: withActiveButton(
                MapboxDraw.modes.draw_polygon,
                MapboxDraw.constants.types.LINE,
            ),
            [DRAW_MODE_MULTIPLE_EDIT]: withActiveButton(
                MapboxDraw.modes.draw_polygon,
                MapboxDraw.constants.types.POLYGON,
            ),
        },
        controls: {
            point: true,
            polygon: true,
            line_string: true,
        },
    });

// mapbox ships these in english and exposes no option to translate them
// mapbox and mapbox-gl-draw build their own control buttons, in English and with their own
// glyphs. These give each one a French label and a DSFR icon; index.scss hides the glyph the
// library painted.
const MAP_CONTROLS: { querySelector: string; title: string; icon: string }[] = [
    { querySelector: '.mapbox-gl-draw_point', title: DRAW_MODE_TITLES_MAP.ADD_DETECTION, icon: 'fr-icon-pencil-line' },
    { querySelector: '.mapbox-gl-draw_polygon', title: DRAW_MODE_TITLES_MAP.MULTIPLE_EDIT, icon: 'fr-icon-crop-line' },
    {
        querySelector: '.mapbox-gl-draw_line',
        title: DRAW_MODE_TITLES_MAP.MULTIPLE_DOWNLOAD,
        icon: 'fr-icon-download-line',
    },
    { querySelector: '.mapboxgl-ctrl-fullscreen', title: 'Plein écran', icon: 'fr-icon-fullscreen-line' },
    // mapbox renames the fullscreen button rather than keeping a state attribute, so this is
    // the same button once fullscreen is on. DSFR ships no exit-fullscreen glyph.
    { querySelector: '.mapboxgl-ctrl-shrink', title: 'Quitter le plein écran', icon: 'fr-icon-close-line' },
    { querySelector: '.mapboxgl-ctrl-zoom-in', title: 'Zoomer', icon: 'fr-icon-add-line' },
    { querySelector: '.mapboxgl-ctrl-zoom-out', title: 'Dézoomer', icon: 'fr-icon-subtract-line' },
    { querySelector: '.mapboxgl-ctrl-geolocate', title: 'Ma position', icon: 'fr-icon-focus-3-line' },
];

const MAP_CONTROL_ICONS = MAP_CONTROLS.map(({ icon }) => icon);

// Re-runnable: every icon this owns is cleared before the right one goes back on, so a
// button mapbox has renamed (fullscreen -> shrink) ends up with one icon, not two.
const syncMapControls = (container: HTMLElement) => {
    for (const { querySelector, title, icon } of MAP_CONTROLS) {
        const control = container.querySelector(querySelector);

        if (!control) {
            continue;
        }

        control.setAttribute('title', title);
        control.setAttribute('aria-label', title);
        control.classList.remove(...MAP_CONTROL_ICONS);
        control.classList.add(icon);
        control.querySelector('.mapboxgl-ctrl-icon')?.setAttribute('title', title);
    }
};

const MAP_PADDINGS = {
    detailSectionShowed: {
        top: 0,
        right: 500, // $detection-detail-panel-width
        bottom: 0,
        left: 0,
    },
    noSectionShowed: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
};

const getSourceId = (layer: MapTileSetLayer) => `source-${layer.tileSet.uuid}`;
const getLayerId = (layer: MapTileSetLayer) => `layer-${layer.tileSet.uuid}`;

const DETECTION_ENDPOINT = detectionEndpoints.getList(false, true);

const GEOJSON_CUSTOM_ZONES_LAYER_ID = 'custom-zones-geojson-layer';
const GEOJSON_CUSTOM_ZONES_LAYER_OUTLINE_ID = 'custom-zones-geojson-layer-outline';

const GEOJSON_CUSTOM_ZONE_NEGATIVE_LAYER_ID = 'custom-zone-negative-geojson-layer';

const GEOJSON_DETECTIONS_LAYER_ID = 'detections-geojson-layer';
const GEOJSON_DETECTION_FROM_COORDINATES_LAYER_ID = 'detection-from-coordinates-geojson-layer';
const GEOJSON_DETECTIONS_LAYER_OUTLINE_ID = 'detections-geojson-layer-outline';
const GEOJSON_LAYER_EXTRA_ID = 'geojson-layer-data-extra';
const GEOJSON_LAYER_EXTRA_BOUNDINGS_ID = 'geojson-layer-data-extra-boundings';
const GEOJSON_PARCEL_LAYER_ID = 'parcel-geojson-layer';
const GEOJSON_ANNOTATION_GRID_LAYER_ID = 'annotation-grid-geojson-layer';
const GEOJSON_ANNOTATION_GRID_LABEL_LAYER_ID = 'annotation-grid-label-geojson-layer';
const GEOJSON_ANNOTATION_GRID_FILL_LAYER_ID = 'annotation-grid-fill-geojson-layer';

const GEOJSON_LAYER_EXTRA_COLOR = '#FF0000';

const MULTIPLE_SELECTION_MAX = 500;

interface MultipleDownloadPage {
    detectionObjectUuid: string;
    parcelUuid: string;
}

interface MultipleDownloadState {
    runId: number;
    nbrDetections: number;
    // undefined while the details of the selected detections are still being fetched
    pages?: MultipleDownloadPage[];
    nbrProcessed: number;
}

const MultipleDownloadBlocker: React.FC<{ state: MultipleDownloadState; onCancel: () => void }> = ({
    state,
    onCancel,
}) => {
    const total = state.pages?.length;
    const fetching = total === undefined;
    const assembling = total !== undefined && state.nbrProcessed >= total;

    return (
        <>
            <h2>Génération des rapports...</h2>
            <p>
                {fetching
                    ? `Récupération des ${state.nbrDetections} détections sélectionnées...`
                    : assembling
                      ? 'Assemblage du document PDF...'
                      : `Fiche ${state.nbrProcessed + 1} / ${total}`}
            </p>
            <p>Cette opération peut prendre quelques minutes</p>
            <p>Veuillez ne pas fermer cette fenêtre</p>
            <Progress
                aria-label="Progression de la génération des rapports"
                mt="md"
                value={fetching || assembling ? 100 : 100 * (state.nbrProcessed / (total || 1))}
                animated={fetching || assembling}
            />
            <Button
                mt="md"
                fullWidth
                variant="outline"
                color="red"
                leftSection={<IconCancel size={20} />}
                onClick={onCancel}
            >
                Annuler
            </Button>
        </>
    );
};

const EMPTY_GEOJSON_FEATURE_COLLECTION: FeatureCollection = {
    type: 'FeatureCollection',
    features: [],
} as const;

interface MapBounds {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
}

const getAnnotationGridFilters = (objectsFilter: ObjectsFilter) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { detectionValidationStatuses, ...annotationFilter } = objectsFilter;
    return annotationFilter;
};

type ObjectFromCoordinatesFetchStatus = 'LOADING' | 'IDLE';
type ObjectFromCoordinates = {
    uuid: string;
    geometry: Polygon;
    objectTypeUuid: string;
    objectTypeColor: string;
};
type ObjectFromCoordinatesState = {
    objectFromCoordinates?: ObjectFromCoordinates;
    fetchStatus: ObjectFromCoordinatesFetchStatus;
};

type DetectionDetailsShowedState = {
    detectionObjectUuid: string;
    detectionUuid?: string;
    detectionHidden?: boolean;
};

interface ComponentProps {
    layers: MapTileSetLayer[];
    displayDetections?: boolean;
    displayLayersGeometry?: boolean;
    fitBoundsFirstLayer?: boolean;
    displayTileSetControls?: boolean;
    displayDrawControl?: boolean;
    skipProcessDetections?: boolean;
    displayLayersSelection?: boolean;
    boundLayers?: boolean;
    initialPosition?: GeoJSON.Position | null;
    initialDetectionObjectUuid?: string;
    syncViewStateToUrl?: boolean;
}

const Component: React.FC<ComponentProps> = ({
    layers,
    displayLayersGeometry,
    initialDetectionObjectUuid,
    fitBoundsFirstLayer = false,
    displayTileSetControls = true,
    displayDetections = true,
    boundLayers = true,
    skipProcessDetections = false,
    displayLayersSelection = true,
    displayDrawControl = true,
    initialPosition,
    syncViewStateToUrl = false,
}) => {
    const [mapBounds, setMapBounds] = useState<MapBounds>();
    const [detectionDetailsShowed, setDetectionDetailsShowed] = useState<DetectionDetailsShowedState | null>(
        initialDetectionObjectUuid
            ? {
                  detectionObjectUuid: initialDetectionObjectUuid,
              }
            : null,
    );
    const [sidePanelSection, setSidePanelSection] = useState<MapSidePanelSection>();
    const [legendShowed, setLegendShowed] = useState(false);
    const [drawMode, setDrawMode] = useState<DrawMode | null>(null);

    const [isDragging, setIsDragging] = useState(false);

    const [parcelPolygonDisplayed, setParcelPolygonDisplayed] = useState<Polygon>();

    const [addAnnotationPolygon, setAddAnnotationPolygon] = useState<Polygon>();
    const [multipleEditDetectionsUuids, setMultipleEditDetectionsUuids] = useState<string[] | undefined>(undefined);

    const [objectFromCoordinates, setObjectFromCoordinates] = useState<ObjectFromCoordinatesState>({
        fetchStatus: 'IDLE',
        objectFromCoordinates: undefined,
    });

    const {
        eventEmitter,
        getTileSetsUuids,
        setTileSetsVisibility,
        backgroundLayerYears,
        settings,
        customZoneLayers,
        annotationLayerVisible,
        customZoneNegativeFilterVisible,
        otherObjectTypesUuids,
        isDetailFetching,
    } = useMap();
    const { objectsFilter } = useObjectsFilter();

    const [cursor, setCursor] = useState<string>();
    const [mapRef, setMapRef] = useState<mapboxgl.Map>();
    const drawControlRef = useRef<MapboxDraw | null>(null);

    // draw handlers are registered once and read these, so they never observe a stale
    // render: re-registering them on every detections refetch would leave a window where
    // a draw.create fires with no listener attached
    const drawModeRef = useRef<DrawMode | null>(null);
    // mapbox-gl-draw acts on mouseup, so by the time the browser dispatches the trailing
    // click the mode is already back to simple_select. This latch swallows that one click.
    const drawEndedGestureRef = useRef(false);

    const [multipleDownload, setMultipleDownload] = useState<MultipleDownloadState>();
    // continuations compare against this instead of a flag: aborting the request cannot reach
    // an already-buffered response, a queued rAF or a generation callback in flight
    const multipleDownloadRunIdRef = useRef(0);
    const multipleDownloadAbortRef = useRef<AbortController | null>(null);

    const customZoneLayersDisplayedUuids = (customZoneLayers || [])
        .filter(({ displayed }) => displayed)
        .map(({ customZoneUuids }) => customZoneUuids)
        .flat();

    // Every zone à enjeux shares one fill layer and one line layer, so the per-layer opacity
    // slider has to be a data-driven match on the feature uuid, not a paint constant.
    const customZoneOpacity = useMemo(() => {
        const displayed = (customZoneLayers || []).filter(
            ({ displayed: isDisplayed, customZoneUuids }) => isDisplayed && customZoneUuids.length,
        );

        const build = (pick: (opacity: number) => number): DataDrivenPropertyValueSpecification<number> => {
            const fallback = pick(DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

            if (!displayed.length) {
                return fallback;
            }

            return [
                'match',
                ['get', 'uuid'],
                ...displayed.flatMap(({ customZoneUuids, opacity }) => [customZoneUuids, pick(opacity)]),
                fallback,
            ] as unknown as DataDrivenPropertyValueSpecification<number>;
        };

        return {
            fill: build((opacity) => getCustomZoneOpacities(opacity).fill),
            line: build((opacity) => getCustomZoneOpacities(opacity).line),
        };
    }, [customZoneLayers]);

    // we get detections for all the layers available for the user, even if they are not displayed
    const tileSetsUuidsDetection = useMemo(
        () =>
            layers
                .filter(
                    (layer) =>
                        ['BACKGROUND', 'PARTIAL'].includes(layer.tileSet.tileSetType) &&
                        ['VISIBLE', 'HIDDEN'].includes(layer.tileSet.tileSetStatus),
                )
                .map((layer) => layer.tileSet.uuid),
        [layers],
    );

    const {
        data,
        refetch,
        isFetching: isDetectionsFetching,
    } = useQuery({
        queryKey: [
            DETECTION_ENDPOINT,
            ...Object.values(mapBounds || {}),
            ...Object.values(objectsFilter || {}),
            ...tileSetsUuidsDetection,
        ],
        queryFn: ({ signal }) => fetchDetections(signal, mapBounds),
        placeholderData: keepPreviousData,
        // at least one zone à enjeux is required (else the API 400s); a user with zero
        // accessible zones simply sees no detections rather than a failing request loop
        enabled:
            displayDetections && !!mapBounds && !isDetailFetching && (objectsFilter?.customZonesUuids.length ?? 0) > 0,
    });

    const handleMapRef = useCallback((node?: mapboxgl.Map) => {
        if (!node) {
            return;
        }

        setMapRef(node);

        // keep pinch-zoom but forbid pinch-rotate, and undo any bearing a prior gesture left behind
        (node as unknown as MapRef).getMap().touchZoomRotate.disableRotation();
        node.setBearing(0);
    }, []);

    const layersDisplayed = layers.filter((layer) => layer.displayed);

    useEffect(() => {
        if (!mapRef || !fitBoundsFirstLayer) {
            return;
        }

        const layer = layersDisplayed.find((layer) => layer.tileSet.geometryBbox);

        if (layer) {
            mapRef.fitBounds(bbox(layer.tileSet.geometryBbox), { padding: 20, animate: false });
        }
        // only once the map is ready: this is an initial framing, not a reaction to layers
    }, [mapRef, fitBoundsFirstLayer]);

    const drawControlDisplayed = displayDetections && displayDrawControl;

    // controls are built per map instance: mapbox controls keep a reference to the map
    // they were added to, so sharing them across the main map and the admin preview maps
    // moves the buttons out of one map and breaks the other
    useEffect(() => {
        if (!mapRef) {
            return;
        }

        const controls: { control: mapboxgl.IControl; position: mapboxgl.ControlPosition }[] = [
            { control: new mapboxgl.ScaleControl(), position: 'bottom-right' },
            { control: new mapboxgl.FullscreenControl(), position: 'bottom-right' },
            {
                control: new mapboxgl.NavigationControl({
                    showCompass: false,
                    showZoom: true,
                    visualizePitch: false,
                }),
                position: 'bottom-right',
            },
        ];

        if (drawControlDisplayed) {
            const drawControl = buildDrawControl();
            drawControlRef.current = drawControl;
            controls.push({ control: drawControl, position: 'top-right' });
        }

        controls.forEach(({ control, position }) => mapRef.addControl(control, position));

        const container = mapRef.getContainer();
        const translateTitlesTimeout = setTimeout(() => syncMapControls(container), 100);

        // mapbox swaps the fullscreen button's class in its own listener; defer so this runs after
        const onFullscreenChange = () => setTimeout(() => syncMapControls(container), 0);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            clearTimeout(translateTitlesTimeout);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            controls.forEach(({ control }) => {
                if (mapRef.hasControl(control)) {
                    mapRef.removeControl(control);
                }
            });
            drawControlRef.current = null;
        };
    }, [mapRef, drawControlDisplayed]);

    // read by the draw handlers below, which are registered once so that a detections
    // refetch can never detach them in the middle of a drawing gesture
    const detectionsDataRef = useRef(data);
    detectionsDataRef.current = data;
    const isDetectionsFetchingRef = useRef(isDetectionsFetching);
    isDetectionsFetchingRef.current = isDetectionsFetching;

    const resetLayersForAddDetectionRef = useRef<() => void>(() => {});
    resetLayersForAddDetectionRef.current = () => {
        const partialLayersDisplayedUuids = getTileSetsUuids(['PARTIAL'], ['VISIBLE', 'HIDDEN'], true);
        let partialLayersToDisplayUuids: string[] = [];

        if (partialLayersDisplayedUuids.length) {
            partialLayersToDisplayUuids = getTileSetsUuids(['PARTIAL'], ['VISIBLE', 'HIDDEN'], false);
        }

        const mostRecentBackgroundLayerYear = (backgroundLayerYears || [])[0];
        const mostRecentBackgroundLayerUuids = mostRecentBackgroundLayerYear
            ? layers
                  .filter(
                      (layer) =>
                          layer.tileSet.tileSetType === 'BACKGROUND' &&
                          formatDateOnly(layer.tileSet.date, 'yyyy') === mostRecentBackgroundLayerYear,
                  )
                  .map((layer) => layer.tileSet.uuid)
            : [];

        setTileSetsVisibility([...partialLayersToDisplayUuids, ...mostRecentBackgroundLayerUuids], true);
    };

    useEffect(() => {
        if (!mapRef) {
            return;
        }

        const getDetectionUuidsFromPolygon = (polygon: Polygon, drawMode: DrawMode): string[] | undefined => {
            const title = DRAW_MODE_TITLES_MAP[drawMode];

            // the selection is computed against the detections already loaded for the
            // viewport: a selection made mid-refetch would silently use the previous ones
            if (isDetectionsFetchingRef.current) {
                notifications.show({
                    title,
                    message: 'Les détections sont en cours de chargement, veuillez réessayer dans un instant',
                    color: 'red',
                });
                return;
            }

            const detectionUuids: string[] = [];

            for (const feature of detectionsDataRef.current?.features || []) {
                if (!booleanIntersects(feature.geometry, polygon)) {
                    continue;
                }

                detectionUuids.push(feature.properties.uuid);
            }

            if (detectionUuids.length > MULTIPLE_SELECTION_MAX) {
                notifications.show({
                    title,
                    message: `Vous avez sélectionné ${detectionUuids.length} objets. La sélection est limitée à ${MULTIPLE_SELECTION_MAX} détections.`,
                    color: 'red',
                });
                return;
            }

            if (!detectionUuids.length) {
                notifications.show({
                    title,
                    message: "Aucune détection n'a été sélectionnée",
                    color: 'red',
                });
                return;
            }

            return detectionUuids;
        };

        const handleModeChange = ({ mode }: { mode: string }) => {
            const newDrawMode = DRAW_MODES_MAP[mode] ?? null;

            drawModeRef.current = newDrawMode;
            setDrawMode(newDrawMode);
            // leaving a draw mode also happens on the click that closes the shape: that
            // click is still on its way to onMapClick and must not be read as a map click
            drawEndedGestureRef.current = true;

            if (!newDrawMode) {
                return;
            }

            setSidePanelSection(undefined);

            if (newDrawMode === 'ADD_DETECTION') {
                resetLayersForAddDetectionRef.current();
                notifications.show({
                    title: DRAW_MODE_TITLES_MAP.ADD_DETECTION,
                    message:
                        "L'affichage des couches a été réinitialisé. Dessinez un rectangle autour de l'objet, Échap pour annuler.",
                });
                return;
            }

            notifications.show({
                title: DRAW_MODE_TITLES_MAP[newDrawMode],
                message:
                    'Cliquez pour poser les points de la zone, puis cliquez sur le premier point ou double-cliquez pour la fermer. Échap pour annuler.',
            });
        };

        const handleCreate = async (event: { features: GeoJSON.Feature[] }) => {
            const drawMode = drawModeRef.current;
            const drawnFeature = event.features?.[0];

            drawEndedGestureRef.current = true;
            // always drop the drawn shape first: every branch below can bail out, and a
            // leftover polygon would stay on the map with no way to remove it
            drawControlRef.current?.deleteAll();

            if (!drawMode || !drawnFeature) {
                return;
            }

            const polygon = drawnFeature.geometry as Polygon;

            if (drawMode === 'ADD_DETECTION') {
                // drawing returns one extra point not needed
                if (polygon.coordinates[0].length >= 6) {
                    polygon.coordinates[0] = polygon.coordinates[0].slice(0, 5);
                }

                setAddAnnotationPolygon(polygon);
                return;
            }

            const detectionUuids = getDetectionUuidsFromPolygon(polygon, drawMode);

            if (!detectionUuids) {
                return;
            }

            if (drawMode === 'MULTIPLE_EDIT') {
                setMultipleEditDetectionsUuids(detectionUuids);
                return;
            }

            const runId = ++multipleDownloadRunIdRef.current;
            const abortController = new AbortController();
            multipleDownloadAbortRef.current = abortController;

            // set before awaiting anything, so the blocker is painted on the click that closes
            // the selection rather than once the detections have been fetched
            setMultipleDownload({ runId, nbrDetections: detectionUuids.length, nbrProcessed: 0 });

            try {
                const detectionObjectsDetails = await api<DetectionObjectDetail[]>(detectionObjectEndpoints.list, {
                    params: {
                        detectionUuids: detectionUuids.join(','),
                        detail: true,
                    },
                    signal: abortController.signal,
                });

                if (multipleDownloadRunIdRef.current !== runId) {
                    return;
                }

                const pages = detectionObjectsDetails
                    .filter((detectionObject) => detectionObject.parcel)
                    .map((detectionObject) => ({
                        detectionObjectUuid: detectionObject.uuid,
                        parcelUuid: String(detectionObject.parcel?.uuid),
                    }));

                // an empty selection would render a PDF with no page at all
                if (!pages.length) {
                    setMultipleDownload(undefined);
                    notifications.show({
                        title: DRAW_MODE_TITLES_MAP.MULTIPLE_DOWNLOAD,
                        message: "Aucune détection sélectionnée n'est rattachée à une parcelle",
                        color: 'red',
                    });
                    return;
                }

                setMultipleDownload((prev) => (prev?.runId === runId ? { ...prev, pages } : prev));
            } catch {
                if (multipleDownloadRunIdRef.current !== runId) {
                    return;
                }

                setMultipleDownload(undefined);
                notifications.show({
                    title: DRAW_MODE_TITLES_MAP.MULTIPLE_DOWNLOAD,
                    message: 'Impossible de récupérer les détections sélectionnées',
                    color: 'red',
                });
            }
        };

        const armDrawEndedGesture = () => {
            drawEndedGestureRef.current = true;
        };
        // any genuinely new interaction starts with a press, which clears the latch
        const disarmDrawEndedGesture = () => {
            drawEndedGestureRef.current = false;
        };

        const cancelDraw = () => {
            const drawControl = drawControlRef.current;

            if (!drawControl) {
                return;
            }

            // dropping the shape first matters: changing mode stops the current one, which
            // would otherwise emit the half-drawn shape as a draw.create
            drawControl.deleteAll();
            // the mode change made through the public api is silent, so the mode state has
            // to be reset here as well
            drawControl.changeMode('simple_select');
            drawModeRef.current = null;
            setDrawMode(null);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || !drawModeRef.current) {
                return;
            }

            cancelDraw();
        };

        mapRef.on('draw.modechange', handleModeChange);
        mapRef.on('draw.create', handleCreate);
        mapRef.on('draw.delete', armDrawEndedGesture);
        mapRef.on('mousedown', disarmDrawEndedGesture);
        mapRef.on('touchstart', disarmDrawEndedGesture);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            mapRef.off('draw.modechange', handleModeChange);
            mapRef.off('draw.create', handleCreate);
            mapRef.off('draw.delete', armDrawEndedGesture);
            mapRef.off('mousedown', disarmDrawEndedGesture);
            mapRef.off('touchstart', disarmDrawEndedGesture);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [mapRef]);

    const fetchDetections = async (signal: AbortSignal, mapBounds?: MapBounds) => {
        if (!displayDetections || !mapBounds || !objectsFilter || !otherObjectTypesUuids) {
            return null;
        }

        if (mapRef && mapRef.getZoom() <= ZOOM_LIMIT_TO_DISPLAY_DETECTIONS) {
            return null;
        }

        const data = await api<DetectionGeojsonData>(DETECTION_ENDPOINT, {
            params: {
                ...mapBounds,
                ...objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids),
                tileSetsUuids: tileSetsUuidsDetection,
            },
            signal,
        });

        if (skipProcessDetections) {
            return data;
        }

        return processDetections(data, otherObjectTypesUuids || new Set());
    };

    const annotationGridFilters = objectsFilter ? getAnnotationGridFilters(objectsFilter) : undefined;

    const fetchAnnotationGrid = async (signal: AbortSignal, mapBounds?: MapBounds) => {
        if (!displayDetections || !mapBounds || !objectsFilter || !annotationLayerVisible) {
            return null;
        }

        if (mapRef && mapRef.getZoom() <= ZOOM_LIMIT_TO_DISPLAY_ANNOTATION_GRID) {
            return null;
        }

        return api<DetectionGeojsonData>(utilsEndpoints.annotationGrid, {
            params: {
                ...mapBounds,
                ...annotationGridFilters,
                tileSetsUuids: tileSetsUuidsDetection,
            },
            signal,
        });
    };
    const { data: annotationGrid, refetch: refetchAnnotationGrid } = useQuery({
        queryKey: [
            utilsEndpoints.annotationGrid,
            ...Object.values(mapBounds || {}),
            ...Object.values(annotationGridFilters || {}),
            ...tileSetsUuidsDetection,
        ],
        queryFn: ({ signal }) => fetchAnnotationGrid(signal, mapBounds),
        placeholderData: keepPreviousData,
        enabled: annotationLayerVisible && !!mapBounds && !isDetailFetching,
    });

    const fetchCustomZoneGeometries = async (signal: AbortSignal, mapBounds?: MapBounds) => {
        if (!mapBounds || (customZoneLayersDisplayedUuids.length === 0 && !customZoneNegativeFilterVisible)) {
            return null;
        }

        return api<GeoCustomZoneResponse>(utilsEndpoints.customGeometry, {
            params: {
                ...mapBounds,
                uuids: customZoneLayersDisplayedUuids,
                uuidsNegative: customZoneNegativeFilterVisible ? objectsFilter?.customZonesUuids || [] : [],
            },
            signal,
        });
    };
    const { data: customZonesData } = useQuery({
        queryKey: [
            utilsEndpoints.customGeometry,
            ...Object.values(mapBounds || {}),
            customZoneLayersDisplayedUuids.join(','),
            (objectsFilter?.customZonesUuids || []).join(','),
            customZoneNegativeFilterVisible,
        ],
        queryFn: ({ signal }) => fetchCustomZoneGeometries(signal, mapBounds),
        placeholderData: keepPreviousData,
        enabled: !!mapBounds && !isDetailFetching,
    });

    useEffect(() => {
        const updateDetections = () => {
            refetchAnnotationGrid();
            refetch();
        };

        eventEmitter.on('UPDATE_DETECTIONS', updateDetections);

        return () => {
            eventEmitter.off('UPDATE_DETECTIONS', updateDetections);
        };
    }, [refetch, refetchAnnotationGrid, eventEmitter]);
    useEffect(() => {
        if (!mapRef) {
            return;
        }

        const jumpTo = (center: mapboxgl.LngLatLike) => {
            mapRef.jumpTo({
                center,
            });
        };

        eventEmitter.on('JUMP_TO', jumpTo);

        return () => {
            eventEmitter.off('JUMP_TO', jumpTo);
        };
    }, [mapRef]);
    useEffect(() => {
        if (!mapRef) {
            return;
        }

        const displayParcel = (polygon: Polygon) => {
            setParcelPolygonDisplayed(polygon);
        };

        eventEmitter.on('DISPLAY_PARCEL', displayParcel);

        return () => {
            eventEmitter.off('DISPLAY_PARCEL', displayParcel);
        };
    }, [mapRef]);
    useEffect(() => {
        refetch();
    }, [objectsFilter, refetch]);

    const loadDataFromBounds = (e: mapboxgl.MapboxEvent | ViewStateChangeEvent) => {
        const map = e.target;
        const bounds = map.getBounds();

        setMapBounds({
            neLat: bounds._ne.lat,
            neLng: bounds._ne.lng,
            swLat: bounds._sw.lat,
            swLng: bounds._sw.lng,
        });

        if (syncViewStateToUrl) {
            const center = map.getCenter();
            setViewStateInUrl(center.lat, center.lng, map.getZoom());
        }
    };

    const cancelMultipleDownload = useCallback(() => {
        // bumping the run id first neutralises everything already in flight, then unmounting
        // SignalementPDFData stops the previews, the pdf render queue and the download itself
        multipleDownloadRunIdRef.current += 1;
        multipleDownloadAbortRef.current?.abort();
        multipleDownloadAbortRef.current = null;
        setMultipleDownload(undefined);

        notifications.show({
            title: DRAW_MODE_TITLES_MAP.MULTIPLE_DOWNLOAD,
            message: 'Génération des fiches de signalement annulée',
        });
    }, []);

    const closeDetectionDetail = useCallback(() => {
        setDetectionDetailsShowed(null);
        setSidePanelSection(undefined);
        setObjectFromCoordinates(() => ({
            fetchStatus: 'IDLE',
            objectFromCoordinates: undefined,
        }));
        mapRef?.easeTo({
            padding: MAP_PADDINGS.noSectionShowed,
            duration: 250,
        });
    }, [mapRef]);

    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clickAbortRef = useRef<AbortController | null>(null);

    const onMapDblClick = useCallback(() => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        if (clickAbortRef.current) {
            clickAbortRef.current.abort();
            clickAbortRef.current = null;
        }
    }, []);

    const onMapClick = (event: mapboxgl.MapLayerMouseEvent | mapboxgl.MapLayerTouchEvent) => {
        if (isDragging) {
            return;
        }

        // the click that closed a shape reaches us after mapbox-gl-draw has already
        // reverted the mode, so the mode alone cannot tell it apart from a real map click
        if (drawEndedGestureRef.current) {
            drawEndedGestureRef.current = false;
            return;
        }

        // a drawing session owns every click on the map, including the ones landing on a
        // detection: opening the detail panel mid-draw would fly the map away
        if (drawModeRef.current) {
            return;
        }

        const { features, target, lngLat } = event;

        // clicked on a displayed square => handle immediately, no timeout needed
        if (features && features.length) {
            if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
            }

            const clickedFeature = features[0];
            const detectionProperties = clickedFeature.properties as DetectionProperties;
            setDetectionDetailsShowed({
                detectionObjectUuid: detectionProperties.detectionObjectUuid,
                detectionUuid: detectionProperties.uuid,
            });

            target.setPadding(MAP_PADDINGS.detailSectionShowed);
            target.flyTo({
                center: getCoord(centroid(clickedFeature.geometry as Polygon)) as [number, number],
            });

            return;
        }

        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
        }

        clickTimerRef.current = setTimeout(async () => {
            // a drawing session may have started between the click and this timeout
            if (drawModeRef.current) {
                return;
            }

            const noSectionOpen = !detectionDetailsShowed && !sidePanelSection;

            closeDetectionDetail();

            if (!noSectionOpen) {
                return;
            }
            // clicking empty space with nothing open: look for a detection hidden by filters
            const { lng, lat } = lngLat;

            if (clickAbortRef.current) {
                clickAbortRef.current.abort();
            }
            const abortController = new AbortController();
            clickAbortRef.current = abortController;

            setObjectFromCoordinates(() => ({
                fetchStatus: 'LOADING',
                objectFromCoordinates: undefined,
            }));

            let objectFromCoordinates: ObjectFromCoordinates | undefined;
            try {
                objectFromCoordinates = await api<ObjectFromCoordinates>(detectionObjectEndpoints.fromCoordinates, {
                    params: {
                        lat,
                        lng,
                    },
                    signal: abortController.signal,
                });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return; // superseded by a newer click, keep the loader for the new request
                }

                setObjectFromCoordinates(() => ({
                    fetchStatus: 'IDLE',
                    objectFromCoordinates: undefined,
                }));

                if (
                    error instanceof ApiError &&
                    (error.body as { code?: string } | undefined)?.code === 'OUTSIDE_CUSTOM_ZONE'
                ) {
                    notifications.show({
                        color: 'red',
                        title: 'Recherche impossible',
                        message: 'Impossible de rechercher une détection en zone urbaine',
                    });
                } else {
                    notifications.show({
                        color: 'red',
                        title: 'Une erreur est survenue',
                        message: 'Impossible de rechercher une détection à cet endroit',
                    });
                }
                return;
            }

            if (!objectFromCoordinates) {
                setObjectFromCoordinates(() => ({
                    fetchStatus: 'IDLE',
                    objectFromCoordinates: undefined,
                }));
                notifications.show({
                    title: 'Aucun objet détecté ici',
                    message: "Aucun objet, même non-visible n'a été détecté ici",
                });
                return;
            }

            notifications.show({
                title: 'Un objet masqué par les filtres actuels a été détecté ici',
                message: 'Vous pouvez le rendre visible dans le panneau latéral',
            });
            setDetectionDetailsShowed({
                detectionObjectUuid: objectFromCoordinates.uuid,
                detectionHidden: true,
            });
            setObjectFromCoordinates(() => ({
                fetchStatus: 'IDLE',
                objectFromCoordinates,
            }));

            target.setPadding(MAP_PADDINGS.detailSectionShowed);
            target.flyTo({
                center: getCoord(centroid(objectFromCoordinates.geometry as Polygon)) as [number, number],
            });
        }, 300);
    };

    const onPolygonMouseEnter = useCallback(() => setCursor('pointer'), []);
    const onPolygonMouseLeave = useCallback(() => setCursor(undefined), []);

    const getLayerBeforeId = (index: number) => {
        if (index) {
            return getLayerId(layersDisplayed[index - 1]);
        }

        if (displayDetections) {
            return GEOJSON_CUSTOM_ZONE_NEGATIVE_LAYER_ID;
        }

        if (displayLayersGeometry) {
            return GEOJSON_LAYER_EXTRA_ID;
        }

        return undefined;
    };
    const handleTouchStart = () => {
        setIsDragging(false);
    };

    const handleMove = () => {
        setIsDragging(true);
    };

    const handleTouchEnd = (e: mapboxgl.MapLayerTouchEvent) => {
        e.preventDefault();
        if (!isDragging) {
            onMapClick(e);
        }
    };

    const handleZoom = () => {
        setIsDragging(true);
    };

    const handleZoomEnd = () => {
        setIsDragging(false);
    };

    return (
        // the bottom-left legend and year slider read this to clear the side panel
        <div
            className={classes.container}
            style={{ '--map-side-panel-open': sidePanelSection ? 1 : 0 } as React.CSSProperties}
        >
            <Map
                reuseMaps={true}
                ref={handleMapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                // Required for Sentry replay canvas recording — WebGL only exposes
                // its pixels for capture with this on. Costs a little GPU per frame;
                // drop it if map perf regresses and canvas replay isn't worth it.
                preserveDrawingBuffer={true}
                initialViewState={getMapInitialViewState(
                    initialPosition,
                    initialDetectionObjectUuid,
                    syncViewStateToUrl && !initialDetectionObjectUuid ? getViewStateFromUrl() : null,
                )}
                onLoad={loadDataFromBounds}
                onMoveEnd={loadDataFromBounds}
                interactiveLayerIds={[GEOJSON_DETECTIONS_LAYER_ID]}
                onClick={onMapClick}
                onDblClick={onMapDblClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleMove}
                onTouchEnd={handleTouchEnd}
                onZoom={handleZoom}
                onZoomEnd={handleZoomEnd}
                onMouseEnter={onPolygonMouseEnter}
                onMouseLeave={onPolygonMouseLeave}
                cursor={cursor}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                maxPitch={0}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                {...(settings?.globalGeometryBbox ? { maxBounds: bbox(settings.globalGeometryBbox) } : {})}
            >
                <GeolocateControl position="bottom-right" />
                {displayDetections ? (
                    <>
                        <MapSidePanel
                            section={sidePanelSection}
                            setSection={setSidePanelSection}
                            displayLayersSelection={displayLayersSelection}
                            layersDisabled={drawMode !== null}
                        />
                        {displayTileSetControls ? <MapControlBackgroundSlider /> : null}
                        <MapControlLegend isShowed={legendShowed} setIsShowed={setLegendShowed} />
                        <MapAddAnnotationModal
                            isShowed={!!addAnnotationPolygon}
                            hide={() => setAddAnnotationPolygon(undefined)}
                            polygon={addAnnotationPolygon}
                        />
                        <EditMultipleDetectionsModal
                            isShowed={!!multipleEditDetectionsUuids}
                            hide={() => setMultipleEditDetectionsUuids(undefined)}
                            detectionsUuids={multipleEditDetectionsUuids}
                        />
                        {isDetectionsFetching || objectFromCoordinates.fetchStatus === 'LOADING' ? (
                            <div className={classes['loaders-container']}>
                                {isDetectionsFetching ? (
                                    <div className={classes['detections-loader-container']}>
                                        <MantineLoader size="sm" />
                                        <div className={classes['loader-text']}>Chargement des détections</div>
                                    </div>
                                ) : null}
                                {objectFromCoordinates.fetchStatus === 'LOADING' ? (
                                    <div className={classes['object-from-coordinates-loader-container']}>
                                        <MantineLoader size="sm" />

                                        <div className={classes['loader-text']}>Recherche d&apos;une détection</div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </>
                ) : null}
                {displayLayersGeometry ? (
                    <Source
                        type="geojson"
                        id="geojson-data-extra-boundings"
                        data={{
                            type: 'FeatureCollection',
                            features: layers
                                .filter((layer) => layer.tileSet.geometryBbox)
                                .map((layer) =>
                                    bboxPolygon(bbox(layer.tileSet.geometryBbox), {
                                        properties: {
                                            uuid: layer.tileSet.uuid,
                                            color: GEOJSON_LAYER_EXTRA_COLOR,
                                        },
                                    }),
                                ),
                        }}
                    >
                        <Layer
                            id={GEOJSON_LAYER_EXTRA_BOUNDINGS_ID}
                            type="line"
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': 2,
                            }}
                        />
                    </Source>
                ) : null}

                <Source
                    id="annotation-grid-data"
                    type="geojson"
                    data={annotationLayerVisible && annotationGrid ? annotationGrid : EMPTY_GEOJSON_FEATURE_COLLECTION}
                >
                    <Layer
                        id={GEOJSON_ANNOTATION_GRID_LAYER_ID}
                        beforeId={displayLayersGeometry ? GEOJSON_LAYER_EXTRA_BOUNDINGS_ID : undefined}
                        type="line"
                        paint={{
                            'line-color': '#ff0000',
                            'line-width': 2,
                            'line-opacity': 0.75,
                        }}
                    />

                    <Layer
                        id={GEOJSON_ANNOTATION_GRID_LABEL_LAYER_ID}
                        beforeId={GEOJSON_ANNOTATION_GRID_LAYER_ID}
                        type="symbol"
                        layout={{
                            'text-field': ['step', ['zoom'], ['get', 'textShort'], 15, ['get', 'text']],
                            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                            'text-size': 12,
                            'text-anchor': 'center',
                            'symbol-placement': 'point',
                        }}
                        paint={{
                            'text-color': '#000000',
                            'text-halo-color': '#ffffff',
                            'text-halo-width': 2,
                        }}
                    />
                    <Layer
                        id={GEOJSON_ANNOTATION_GRID_FILL_LAYER_ID}
                        beforeId={GEOJSON_ANNOTATION_GRID_LABEL_LAYER_ID}
                        type="fill"
                        paint={{
                            'fill-opacity': 0.1,
                            'fill-color': [
                                'case',
                                ['==', ['get', 'total'], 0],
                                'transparent',
                                [
                                    'interpolate',
                                    ['linear'],
                                    ['/', ['get', 'reviewed'], ['get', 'total']],
                                    0,
                                    '#ff0000',
                                    0.5,
                                    '#ffa500',
                                    1,
                                    '#00ff00',
                                ],
                            ],
                        }}
                    />
                </Source>

                <Source id="detections-geojson-data" type="geojson" data={data || EMPTY_GEOJSON_FEATURE_COLLECTION}>
                    <Layer
                        id={GEOJSON_DETECTIONS_LAYER_ID}
                        beforeId={GEOJSON_ANNOTATION_GRID_FILL_LAYER_ID}
                        type="fill"
                        paint={{
                            'fill-opacity': 0,
                        }}
                    />
                    <Layer
                        id={GEOJSON_DETECTIONS_LAYER_OUTLINE_ID}
                        beforeId={GEOJSON_DETECTIONS_LAYER_ID}
                        type="line"
                        paint={{
                            'line-color': ['get', 'objectTypeColor'],
                            'line-width': [
                                'case',
                                [
                                    '==',
                                    ['get', 'detectionObjectUuid'],
                                    detectionDetailsShowed?.detectionObjectUuid || null,
                                ],
                                4,
                                2,
                            ],
                        }}
                    />
                </Source>
                <Source
                    id="detection-from-coordinate-geojson-data"
                    type="geojson"
                    data={objectFromCoordinates.objectFromCoordinates?.geometry || EMPTY_GEOJSON_FEATURE_COLLECTION}
                >
                    <Layer
                        id={GEOJSON_DETECTION_FROM_COORDINATES_LAYER_ID}
                        beforeId={GEOJSON_DETECTIONS_LAYER_OUTLINE_ID}
                        type="line"
                        paint={{
                            'line-width': 2,
                            'line-dasharray': [2, 2],
                            'line-color': objectFromCoordinates.objectFromCoordinates?.objectTypeColor || 'transparent',
                        }}
                    />
                </Source>
                <Source
                    id="parcel-geojson-data"
                    type="geojson"
                    data={parcelPolygonDisplayed || EMPTY_GEOJSON_FEATURE_COLLECTION}
                >
                    <Layer
                        id={GEOJSON_PARCEL_LAYER_ID}
                        beforeId={GEOJSON_DETECTION_FROM_COORDINATES_LAYER_ID}
                        type="line"
                        paint={{
                            'line-width': 2,
                            'line-color': PARCEL_COLOR,
                            'line-dasharray': [2, 2],
                        }}
                    />
                </Source>
                <Source
                    id="custom-zones-geojson-data"
                    type="geojson"
                    data={customZonesData?.customZones || EMPTY_GEOJSON_FEATURE_COLLECTION}
                >
                    <Layer
                        id={GEOJSON_CUSTOM_ZONES_LAYER_ID}
                        beforeId={GEOJSON_PARCEL_LAYER_ID}
                        type="fill"
                        paint={{
                            'fill-color': ['get', 'color'],
                            'fill-opacity': customZoneOpacity.fill,
                        }}
                    />
                    <Layer
                        id={GEOJSON_CUSTOM_ZONES_LAYER_OUTLINE_ID}
                        beforeId={GEOJSON_CUSTOM_ZONES_LAYER_ID}
                        type="line"
                        paint={{
                            'line-color': ['get', 'color'],
                            'line-opacity': customZoneOpacity.line,
                            'line-width': 2,
                            'line-dasharray': [2, 2],
                        }}
                    />
                </Source>
                <Source
                    id="custom-zone-negative-geojson-data"
                    type="geojson"
                    data={
                        customZonesData?.customZoneNegative
                            ? featureCollection([feature(customZonesData.customZoneNegative)])
                            : EMPTY_GEOJSON_FEATURE_COLLECTION
                    }
                >
                    <Layer
                        id={GEOJSON_CUSTOM_ZONE_NEGATIVE_LAYER_ID}
                        beforeId={GEOJSON_CUSTOM_ZONES_LAYER_OUTLINE_ID}
                        type="fill"
                        paint={{
                            'fill-color': CUSTOM_ZONE_NEGATIVE_COLOR,
                            'fill-opacity': CUSTOM_ZONE_NEGATIVE_OPACITY,
                        }}
                    />
                </Source>
                {layersDisplayed.map((layer, index) => (
                    <Source
                        key={layer.tileSet.uuid}
                        id={getSourceId(layer)}
                        type="raster"
                        scheme={layer.tileSet.tileSetScheme}
                        tiles={[layer.tileSet.url]}
                        tileSize={256}
                        {...(layer.tileSet.maxZoom
                            ? {
                                  maxzoom: layer.tileSet.maxZoom,
                              }
                            : {})}
                        {...(layer.tileSet.minZoom
                            ? {
                                  minzoom: layer.tileSet.minZoom,
                              }
                            : {})}
                        {...(boundLayers && layer.tileSet.geometryBbox
                            ? {
                                  bounds: bbox(layer.tileSet.geometryBbox),
                              }
                            : {})}
                    >
                        <Layer
                            beforeId={getLayerBeforeId(index)}
                            metadata={layer.tileSet}
                            id={getLayerId(layer)}
                            type="raster"
                            source={getSourceId(layer)}
                            paint={{
                                'raster-saturation': layer.tileSet.monochrome ? -1 : 0,
                                'raster-opacity-transition': {
                                    duration: 0,
                                    delay: 0,
                                },
                                'raster-fade-duration': 0,
                            }}
                            {...(layer.tileSet.maxZoom
                                ? {
                                      maxzoom: layer.tileSet.maxZoom,
                                  }
                                : {})}
                            {...(layer.tileSet.minZoom
                                ? {
                                      minzoom: layer.tileSet.minZoom,
                                  }
                                : {})}
                        />
                    </Source>
                ))}

                {detectionDetailsShowed ? (
                    <div className={classes['map-detection-detail-panel-container']}>
                        <DetectionDetail
                            detectionObjectUuid={detectionDetailsShowed.detectionObjectUuid}
                            detectionUuid={detectionDetailsShowed.detectionUuid}
                            detectionHidden={!!objectFromCoordinates.objectFromCoordinates}
                            setDetectionUnhidden={() => {
                                refetch();
                                setObjectFromCoordinates(() => ({
                                    fetchStatus: 'IDLE',
                                    objectFromCoordinates: undefined,
                                }));
                            }}
                            onClose={() => closeDetectionDetail()}
                        />
                    </div>
                ) : undefined}
            </Map>
            {multipleDownload ? (
                <>
                    {multipleDownload.pages ? (
                        <SignalementPDFData
                            // a cancel followed by a new selection must not inherit the
                            // previews already captured by the previous run
                            key={multipleDownload.runId}
                            previewParams={multipleDownload.pages}
                            onGenerationFinished={(error?: string, skippedReasons?: string[]) => {
                                if (multipleDownloadRunIdRef.current !== multipleDownload.runId) {
                                    return;
                                }

                                if (error) {
                                    notifications.show({
                                        title: 'Erreur lors de la génération des fiches de signalement',
                                        message: error,
                                        color: 'red',
                                    });
                                } else if (skippedReasons?.length) {
                                    // the document downloads with fewer sheets than objects selected,
                                    // which is invisible without this
                                    notifications.show({
                                        title: 'Certaines fiches de signalement sont absentes du document',
                                        message: skippedReasons.join(' '),
                                        color: 'orange',
                                    });
                                }

                                setMultipleDownload(undefined);
                            }}
                            setNbrDetectionObjectsProcessed={(nbr) =>
                                setMultipleDownload((prev) =>
                                    prev?.runId === multipleDownload.runId && prev.nbrProcessed !== nbr
                                        ? { ...prev, nbrProcessed: nbr }
                                        : prev,
                                )
                            }
                        />
                    ) : null}
                    <LoadingOverlay
                        zIndex={10000000}
                        visible={true}
                        loaderProps={{
                            children: (
                                <MultipleDownloadBlocker state={multipleDownload} onCancel={cancelMultipleDownload} />
                            ),
                        }}
                    />
                </>
            ) : null}
        </div>
    );
};

export default Component;
