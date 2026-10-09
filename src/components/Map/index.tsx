import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { GeolocateControl, Layer, MapRef, Source, ViewStateChangeEvent } from 'react-map-gl';

import { detectionEndpoints, detectionObjectEndpoints, utilsEndpoints } from '@/api/endpoints';
import DetectionDetail from '@/components/DetectionDetail';
import { markDetectionObjectOpened } from '@/components/DetectionDetail/tracking';
import EditMultipleDetectionsModal from '@/components/EditMultipleDetectionsModal';
import MapAddAnnotationModal from '@/components/Map/MapAddAnnotationModal';
import MapSidePanel, { MapSidePanelSection } from '@/components/Map/MapSidePanel';
import MapControlBackgroundSlider from '@/components/Map/controls/MapControlBackgroundSlider';
import MapControlLegend from '@/components/Map/controls/MapControlLegend';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import { processDetections } from '@/components/Map/utils/process-detections';
import {
    DRAW_TOOL_TRACKING_NAMES,
    DrawMode,
    MAP_SIDE_PANEL_TRACKING_NAMES,
    trackMapPanelOpened,
    trackSignalementCancelled,
    trackSignalementDownloaded,
    trackSignalementFailed,
    trackSignalementStarted,
} from '@/components/Map/utils/tracking';
import SignalementPDFData, { SignalementFailureReason } from '@/components/signalement-pdf/SignalementPDFData';
import { DetectionGeojsonData, DetectionProperties } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { DetectionObjectDetail } from '@/models/detection-object';
import { GeoCustomZoneResponse } from '@/models/geo/geo-custom-zone';
import { MapTileSetLayer } from '@/models/map-layer';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import api, { ApiError } from '@/utils/api';
import { getCustomZoneOpacities } from '@/utils/colors';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY, MAPBOX_TOKEN, PARCEL_COLOR } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { getViewStateFromUrl, setViewStateInUrl } from '@/utils/map-url';
import { trackEvent } from '@/utils/matomo';
import { getErrorTrackingName, getFilterTrackingName, TRACKING_CATEGORIES } from '@/utils/tracking';
import { Button, LoadingOverlay, Loader as MantineLoader, Progress } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { IconCancel } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { bbox, bboxPolygon, booleanIntersects, centroid, getCoord } from '@turf/turf';
import { FeatureCollection, Polygon } from 'geojson';
import { isEqual } from 'lodash';
import mapboxgl, { DataDrivenPropertyValueSpecification } from 'mapbox-gl';
import DrawRectangle, { DrawStyles } from 'mapbox-gl-draw-rectangle-restrict-area';
import classes from './index.module.scss';

const ZOOM_LIMIT_TO_DISPLAY_DETECTIONS = 9;
const ZOOM_LIMIT_TO_DISPLAY_ANNOTATION_GRID = 13;
// up to this zoom, a viewport spans about a commune or more
const ZOOM_LIMIT_WIDE_VIEW = 13;
// a tap runs onMapClick from onTouchEnd, then the browser may synthesize a click on the same spot
const TAP_CLICK_DEDUPE_DELAY_MS = 800;

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
    startedAt: number;
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

type MapDataQuery = 'detections' | 'customZones' | 'annotationGrid';

const MAP_DATA_ERROR_MESSAGES: Record<MapDataQuery, string> = {
    detections: "Les détections n'ont pas pu être chargées",
    customZones: "Les zones à enjeux n'ont pas pu être affichées",
    annotationGrid: "La grille d'annotation n'a pas pu être chargée",
};

// Once per page load: a failing query fails again on every pan.
const notifiedMapDataErrors = new Set<MapDataQuery>();

const notifyMapDataError = (query: MapDataQuery) => {
    if (notifiedMapDataErrors.has(query)) {
        return;
    }

    notifiedMapDataErrors.add(query);
    notifications.show({
        color: 'red',
        title: 'Une erreur est survenue',
        message: `${MAP_DATA_ERROR_MESSAGES[query]}, déplacez la carte ou rechargez la page pour réessayer`,
    });
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
    // read by cancelMultipleDownload, which is created once
    const multipleDownloadRef = useRef(multipleDownload);
    multipleDownloadRef.current = multipleDownload;

    // the object whose opening was last tracked: a re-click on it, or the click following a tap, is not a new one
    const trackedDetectionObjectUuidRef = useRef<string | null>(initialDetectionObjectUuid ?? null);

    // sorted: reordering the layers in the « Couches » panel must not refetch their geometries
    const customZoneLayersDisplayedUuids = (customZoneLayers || [])
        .filter(({ displayed }) => displayed)
        .map(({ customZoneUuids }) => customZoneUuids)
        .flat()
        .sort();

    const customZoneLayersDisplayed = useMemo(
        () =>
            (customZoneLayers || []).filter(
                ({ displayed: isDisplayed, customZoneUuids }) => isDisplayed && customZoneUuids.length,
            ),
        [customZoneLayers],
    );

    // Every zone à enjeux shares one fill layer and one line layer, so the per-layer opacity
    // slider has to be a data-driven match on the feature uuid, not a paint constant.
    const customZoneOpacity = useMemo(() => {
        const build = (pick: (opacity: number) => number): DataDrivenPropertyValueSpecification<number> => {
            const fallback = pick(DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

            if (!customZoneLayersDisplayed.length) {
                return fallback;
            }

            return [
                'match',
                ['get', 'uuid'],
                ...customZoneLayersDisplayed.flatMap(({ customZoneUuids, opacity }) => [
                    customZoneUuids,
                    pick(opacity),
                ]),
                fallback,
            ] as unknown as DataDrivenPropertyValueSpecification<number>;
        };

        return {
            fill: build((opacity) => getCustomZoneOpacities(opacity).fill),
            line: build((opacity) => getCustomZoneOpacities(opacity).line),
        };
    }, [customZoneLayersDisplayed]);

    // the layer listed first in the « Couches » panel is drawn above the others
    const customZoneSortKey = useMemo(
        (): DataDrivenPropertyValueSpecification<number> =>
            customZoneLayersDisplayed.length > 1
                ? ([
                      'match',
                      ['get', 'uuid'],
                      ...customZoneLayersDisplayed.flatMap(({ customZoneUuids }, index) => [
                          customZoneUuids,
                          customZoneLayersDisplayed.length - index,
                      ]),
                      0,
                  ] as unknown as DataDrivenPropertyValueSpecification<number>)
                : 0,
        [customZoneLayersDisplayed],
    );

    // we get detections for all the layers available for the user, even if they are not displayed
    // (sorted: reordering the layers in the « Couches » panel must not refetch the detections)
    const tileSetsUuidsDetection = useMemo(
        () =>
            layers
                .filter(
                    (layer) =>
                        ['BACKGROUND', 'PARTIAL'].includes(layer.tileSet.tileSetType) &&
                        ['VISIBLE', 'HIDDEN'].includes(layer.tileSet.tileSetStatus),
                )
                .map((layer) => layer.tileSet.uuid)
                .sort(),
        [layers],
    );

    const {
        data,
        refetch,
        isFetching: isDetectionsFetching,
        isPlaceholderData: isDetectionsPlaceholderData,
        error: detectionsError,
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

    useEffect(() => {
        if (detectionsError) {
            notifyMapDataError('detections');
        }
    }, [detectionsError]);

    // Armed with the viewport of a filter change the agent makes, checked once the detections it refetches settle.
    const emptyViewportCheckBoundsRef = useRef<MapBounds | null>(null);
    const trackedEmptyViewportsRef = useRef(new Set<string>());
    const mapBoundsRef = useRef(mapBounds);
    mapBoundsRef.current = mapBounds;

    const armEmptyViewportCheck = useCallback(() => {
        emptyViewportCheckBoundsRef.current = mapBoundsRef.current ?? null;
    }, []);

    useEffect(() => {
        const armedBounds = emptyViewportCheckBoundsRef.current;

        if (!armedBounds || isDetectionsFetching || isDetectionsPlaceholderData) {
            return;
        }
        emptyViewportCheckBoundsRef.current = null;

        // moved since the change: the result is no longer the filter's alone
        if (
            !mapRef ||
            !mapBounds ||
            !objectsFilter ||
            !data ||
            data.features.length ||
            !isEqual(armedBounds, mapBounds)
        ) {
            return;
        }

        const zoom = mapRef.getZoom();
        if (zoom <= ZOOM_LIMIT_TO_DISPLAY_DETECTIONS) {
            return;
        }

        const name = `${getFilterTrackingName(objectsFilter)} : ${zoom <= ZOOM_LIMIT_WIDE_VIEW ? 'Vue large' : 'Vue rapprochée'}`;
        const key = `${name}|${Object.values(mapBounds).join(',')}`;
        if (trackedEmptyViewportsRef.current.has(key)) {
            return;
        }

        trackedEmptyViewportsRef.current.add(key);
        trackEvent(TRACKING_CATEGORIES.mapFilters, 'Aucun résultat affiché', name);
    }, [data, isDetectionsFetching, isDetectionsPlaceholderData, mapBounds]);

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
            const trackSelectionRefused = (reason: string, nbrSelected?: number) => {
                if (syncViewStateToUrl) {
                    trackEvent(
                        TRACKING_CATEGORIES.mapTools,
                        'Sélection refusée',
                        `${DRAW_TOOL_TRACKING_NAMES[drawMode]} : ${reason}`,
                        nbrSelected,
                    );
                }
            };

            // the selection is computed against the detections already loaded for the
            // viewport: a selection made mid-refetch would silently use the previous ones
            if (isDetectionsFetchingRef.current) {
                notifications.show({
                    title,
                    message: 'Les détections sont en cours de chargement, veuillez réessayer dans un instant',
                    color: 'red',
                });
                trackSelectionRefused('Détections en cours de chargement');
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
                trackSelectionRefused(`Plus de ${MULTIPLE_SELECTION_MAX} détections`, detectionUuids.length);
                return;
            }

            if (!detectionUuids.length) {
                notifications.show({
                    title,
                    message: "Aucune détection n'a été sélectionnée",
                    color: 'red',
                });
                // below this zoom no detection is loaded, so the selection could not catch any
                trackSelectionRefused(
                    mapRef.getZoom() <= ZOOM_LIMIT_TO_DISPLAY_DETECTIONS ? 'Zoom insuffisant' : 'Aucune détection',
                );
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

            // only the toolbar enters a draw mode: cancelDraw's own mode change is silent
            if (syncViewStateToUrl) {
                trackEvent(TRACKING_CATEGORIES.mapTools, 'Outil activé', DRAW_TOOL_TRACKING_NAMES[newDrawMode]);
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
                if (syncViewStateToUrl) {
                    trackEvent(TRACKING_CATEGORIES.bulkEdit, 'Formulaire ouvert', 'Carte', detectionUuids.length);
                }
                setMultipleEditDetectionsUuids(detectionUuids);
                return;
            }

            const runId = ++multipleDownloadRunIdRef.current;
            const abortController = new AbortController();
            multipleDownloadAbortRef.current = abortController;

            // set before awaiting anything, so the blocker is painted on the click that closes
            // the selection rather than once the detections have been fetched
            setMultipleDownload({
                runId,
                startedAt: Date.now(),
                nbrDetections: detectionUuids.length,
                nbrProcessed: 0,
            });

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
                    if (syncViewStateToUrl) {
                        trackSignalementFailed('Sélection multiple', 'Aucune parcelle');
                    }
                    return;
                }

                if (syncViewStateToUrl) {
                    trackSignalementStarted('Sélection multiple', pages.length);
                }
                setMultipleDownload((prev) => (prev?.runId === runId ? { ...prev, pages } : prev));
            } catch {
                // a cancel bumps the run id first, so its abort never reaches this point
                if (multipleDownloadRunIdRef.current !== runId) {
                    return;
                }

                if (syncViewStateToUrl) {
                    trackSignalementFailed('Sélection multiple', 'Récupération');
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

        // Switching tools mid-shape stops the current mode, which emits the half-drawn shape as a draw.create
        // of the previous tool. Captured on the container, this runs before the toolbar button's own handler.
        const dropShapeBeforeToolSwitch = (event: MouseEvent) => {
            if (
                drawModeRef.current &&
                event.target instanceof Element &&
                event.target.closest(`.${MapboxDraw.constants.classes.CONTROL_BUTTON}`)
            ) {
                drawControlRef.current?.deleteAll();
            }
        };
        const mapContainer = mapRef.getContainer();

        mapRef.on('draw.modechange', handleModeChange);
        mapRef.on('draw.create', handleCreate);
        mapRef.on('draw.delete', armDrawEndedGesture);
        mapRef.on('mousedown', disarmDrawEndedGesture);
        mapRef.on('touchstart', disarmDrawEndedGesture);
        document.addEventListener('keydown', handleKeyDown);
        mapContainer.addEventListener('click', dropShapeBeforeToolSwitch, true);

        return () => {
            mapRef.off('draw.modechange', handleModeChange);
            mapRef.off('draw.create', handleCreate);
            mapRef.off('draw.delete', armDrawEndedGesture);
            mapRef.off('mousedown', disarmDrawEndedGesture);
            mapRef.off('touchstart', disarmDrawEndedGesture);
            document.removeEventListener('keydown', handleKeyDown);
            mapContainer.removeEventListener('click', dropShapeBeforeToolSwitch, true);
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
    const {
        data: annotationGrid,
        refetch: refetchAnnotationGrid,
        error: annotationGridError,
    } = useQuery({
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

    useEffect(() => {
        if (annotationGridError) {
            notifyMapDataError('annotationGrid');
        }
    }, [annotationGridError]);

    const fetchCustomZoneGeometries = async (signal: AbortSignal, mapBounds?: MapBounds) => {
        if (!mapBounds || customZoneLayersDisplayedUuids.length === 0) {
            return null;
        }

        return api<GeoCustomZoneResponse>(utilsEndpoints.customGeometry, {
            params: {
                ...mapBounds,
                uuids: customZoneLayersDisplayedUuids,
            },
            signal,
        });
    };
    const { data: customZonesData, error: customZonesError } = useQuery({
        queryKey: [
            utilsEndpoints.customGeometry,
            ...Object.values(mapBounds || {}),
            customZoneLayersDisplayedUuids.join(','),
        ],
        queryFn: ({ signal }) => fetchCustomZoneGeometries(signal, mapBounds),
        placeholderData: keepPreviousData,
        enabled: !!mapBounds && !isDetailFetching,
    });

    useEffect(() => {
        if (customZonesError) {
            notifyMapDataError('customZones');
        }
    }, [customZonesError]);

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
        const cancelledRun = multipleDownloadRef.current;
        multipleDownloadRef.current = undefined;
        if (cancelledRun && syncViewStateToUrl) {
            trackSignalementCancelled('Sélection multiple', cancelledRun.startedAt);
        }

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
        trackedDetectionObjectUuidRef.current = null;
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

    const trackDetectionOpened = (detectionObjectUuid: string, name: string) => {
        if (!syncViewStateToUrl || trackedDetectionObjectUuidRef.current === detectionObjectUuid) {
            return;
        }

        trackedDetectionObjectUuidRef.current = detectionObjectUuid;
        trackEvent(TRACKING_CATEGORIES.detection, 'Fiche ouverte', name);
        // lets the panel report what blocks the agent on this opening, and only this one
        markDetectionObjectOpened(detectionObjectUuid);
    };

    const trackClickSearch = (name: string) => {
        if (syncViewStateToUrl) {
            trackEvent(TRACKING_CATEGORIES.map, 'Recherche au clic effectuée', name);
        }
    };

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
            trackDetectionOpened(
                detectionProperties.detectionObjectUuid,
                `Carte : ${detectionProperties.detectionValidationStatus}`,
            );
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
                    trackClickSearch('Hors zone à enjeux');
                    notifications.show({
                        color: 'red',
                        title: 'Recherche impossible',
                        message: 'Impossible de rechercher une détection en zone urbaine',
                    });
                } else {
                    trackClickSearch(`Erreur ${getErrorTrackingName(error)}`);
                    notifications.show({
                        color: 'red',
                        title: 'Une erreur est survenue',
                        message: 'Impossible de rechercher une détection à cet endroit',
                    });
                }
                return;
            }

            if (!objectFromCoordinates) {
                trackClickSearch('Aucun objet');
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

            // below this zoom the detection was just not loaded, though the message says it is filtered out
            trackClickSearch(
                target.getZoom() <= ZOOM_LIMIT_TO_DISPLAY_DETECTIONS
                    ? 'Détection trouvée (zoom insuffisant)'
                    : 'Détection masquée trouvée',
            );
            trackDetectionOpened(objectFromCoordinates.uuid, 'Détection masquée');
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
            return GEOJSON_CUSTOM_ZONES_LAYER_OUTLINE_ID;
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

    const lastTapAtRef = useRef(0);

    const handleTouchEnd = (e: mapboxgl.MapLayerTouchEvent) => {
        e.preventDefault();
        if (!isDragging) {
            lastTapAtRef.current = Date.now();
            onMapClick(e);
        }
    };

    const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
        if (Date.now() - lastTapAtRef.current < TAP_CLICK_DEDUPE_DELAY_MS) {
            return;
        }

        onMapClick(e);
    };

    const trackGeolocate = (name: string) => {
        if (syncViewStateToUrl) {
            trackEvent(TRACKING_CATEGORIES.map, 'Géolocalisation utilisée', name);
        }
    };

    // from the rail's own buttons: draw mode and closeDetectionDetail also close the panel
    const showSidePanelSection = (section?: MapSidePanelSection) => {
        if (section && syncViewStateToUrl) {
            trackMapPanelOpened(MAP_SIDE_PANEL_TRACKING_NAMES[section]);
        }
        setSidePanelSection(section);
    };

    // a flyTo/easeTo has no originalEvent: a tap made during that animation is still a tap
    const handleZoom = (e: ViewStateChangeEvent) => {
        if (e.originalEvent) {
            setIsDragging(true);
        }
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
                onClick={handleClick}
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
                <GeolocateControl
                    position="bottom-right"
                    onGeolocate={() => trackGeolocate('Succès')}
                    // 1 is PERMISSION_DENIED, 2 and 3 a position that could not be obtained in time
                    onError={(error) => trackGeolocate(error.code === 1 ? 'Refusée' : 'Indisponible')}
                    // fired instead of onGeolocate outside the maxBounds of the map
                    onOutOfMaxBounds={() => trackGeolocate('Hors zone')}
                />
                {displayDetections ? (
                    <>
                        <MapSidePanel
                            section={sidePanelSection}
                            setSection={showSidePanelSection}
                            displayLayersSelection={displayLayersSelection}
                            layersDisabled={drawMode !== null}
                            tracked={syncViewStateToUrl}
                            onFilterUserChange={syncViewStateToUrl ? armEmptyViewportCheck : undefined}
                        />
                        {displayTileSetControls ? <MapControlBackgroundSlider tracked={syncViewStateToUrl} /> : null}
                        <MapControlLegend
                            isShowed={legendShowed}
                            setIsShowed={(state: boolean) => {
                                if (state && syncViewStateToUrl) {
                                    trackMapPanelOpened('Légende');
                                }
                                setLegendShowed(state);
                            }}
                        />
                        <MapAddAnnotationModal
                            isShowed={!!addAnnotationPolygon}
                            hide={() => setAddAnnotationPolygon(undefined)}
                            onCancel={() => {
                                if (syncViewStateToUrl) {
                                    trackEvent(TRACKING_CATEGORIES.mapTools, 'Ajout annulé');
                                }
                                setAddAnnotationPolygon(undefined);
                            }}
                            polygon={addAnnotationPolygon}
                            tracked={syncViewStateToUrl}
                        />
                        <EditMultipleDetectionsModal
                            isShowed={!!multipleEditDetectionsUuids}
                            hide={() => setMultipleEditDetectionsUuids(undefined)}
                            detectionsUuids={multipleEditDetectionsUuids}
                            trackingSource={syncViewStateToUrl ? 'Carte' : undefined}
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
                        layout={{
                            'fill-sort-key': customZoneSortKey,
                        }}
                        paint={{
                            'fill-color': ['get', 'color'],
                            'fill-opacity': customZoneOpacity.fill,
                        }}
                    />
                    <Layer
                        id={GEOJSON_CUSTOM_ZONES_LAYER_OUTLINE_ID}
                        beforeId={GEOJSON_CUSTOM_ZONES_LAYER_ID}
                        type="line"
                        layout={{
                            'line-sort-key': customZoneSortKey,
                        }}
                        paint={{
                            'line-color': ['get', 'color'],
                            'line-opacity': customZoneOpacity.line,
                            'line-width': 2,
                            'line-dasharray': [2, 2],
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
                            onGenerationFinished={(
                                error?: string,
                                failureReason?: SignalementFailureReason,
                                skippedPagesReasons?: string[],
                            ) => {
                                if (multipleDownloadRunIdRef.current !== multipleDownload.runId) {
                                    return;
                                }
                                // one outcome per run: whatever this run reports after it is stale
                                multipleDownloadRunIdRef.current += 1;

                                if (error) {
                                    notifications.show({
                                        title: 'Erreur lors de la génération des fiches de signalement',
                                        message: error,
                                        color: 'red',
                                    });
                                } else if (skippedPagesReasons?.length) {
                                    // the document downloads with fewer sheets than objects selected,
                                    // which is invisible without this
                                    notifications.show({
                                        title: 'Certaines fiches de signalement sont absentes du document',
                                        message: skippedPagesReasons.join(' '),
                                        color: 'orange',
                                    });
                                }

                                if (syncViewStateToUrl) {
                                    if (error) {
                                        trackSignalementFailed('Sélection multiple', failureReason);
                                    } else {
                                        trackSignalementDownloaded('Sélection multiple', multipleDownload.startedAt);
                                    }
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
