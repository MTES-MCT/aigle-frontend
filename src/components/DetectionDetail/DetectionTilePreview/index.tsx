import { TileSet } from '@/models/tile-set';
import { MAPBOX_TOKEN } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { extendBbox } from '@/utils/geojson';
import { ActionIcon, Overlay, Tooltip } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { IconPencil, IconPhotoOff, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import clsx from 'clsx';
import { Polygon, Position } from 'geojson';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, MapEvent, MapRef, MapSourceDataEvent, MapStyle, Source } from 'react-map-gl';
import classes from './index.module.scss';

interface PreviewGeometry {
    color: string;
    geometry: Polygon;
}

interface ClassNames {
    wrapper?: string;
    main?: string;
    inner?: string;
}

const RASTER_SOURCE_ID = 'raster-source';
const RASTER_LAYER_ID = 'raster-layer';
const GEOJSON_SOURCE_ID = 'geojson-data';
const GEOJSON_LAYER_ID = 'geojson-layer';
const PIN_SOURCE_ID = 'pin-data';
const PIN_LAYER_ID = 'pin-layer';

// A preview only ever shows the imagery of its tile set. Loading the mapbox streets style
// would download a whole vector basemap for each of the previews displayed at once and,
// when the imagery is missing, would leave a street map that reads as a broken preview.
const PREVIEW_MAP_STYLE: MapStyle = {
    version: 8,
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
        {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#e9ecef' },
        },
    ],
};

// imagery can legitimately be missing: tile sets are attached to whole collectivities but
// their tiles only cover the zones that were actually flown over
const IMAGERY_TIMEOUT_MS = 15000;

// mapbox answers "loaded" optimistically: a source cache reports itself loaded once it has
// errored a single time (one 404 tile is enough here) and while it still holds no tile at
// all, and `idle` inherits both. Requiring the map to then stay quiet is what proves the
// last tile has been drawn - reading the canvas earlier captures a half-painted overlay.
const IDLE_QUIET_PERIOD_MS = 200;

type PreviewControl = 'ZOOM' | 'EDIT';
type ImageryStatus = 'LOADING' | 'LOADED' | 'UNAVAILABLE';

interface ComponentProps {
    geometries?: PreviewGeometry[];
    tileSet: TileSet;
    bounds: [number, number, number, number];
    classNames?: ClassNames;
    displayName?: boolean;
    strokedLine?: boolean;
    controlsDisplayed?: PreviewControl[];
    editDetection?: () => void;
    extendedLevel?: number;
    id?: string;
    onFullyLoaded?: () => void;
    marker?: React.ReactNode;
    reuseMaps?: boolean;
    pinPosition?: Position;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fitBoundsOptions?: any;
}

const Component: React.FC<ComponentProps> = ({
    bounds,
    geometries,
    tileSet,
    classNames,
    displayName = true,
    strokedLine = false,
    controlsDisplayed,
    editDetection,
    extendedLevel = 0,
    id,
    onFullyLoaded,
    // react-map-gl recycles maps through a global pool without resetting their sources or
    // re-applying `bounds`, so a recycled preview can keep another year's tiles and camera
    reuseMaps = false,
    pinPosition,
    fitBoundsOptions,
}) => {
    const mapRef = useRef<MapRef>(null);
    const [currentExtendedLevel, setCurrentExtendedLevel] = useState(extendedLevel);
    const bounds_ = useMemo(
        () => (currentExtendedLevel ? extendBbox(bounds, currentExtendedLevel) : bounds),
        [currentExtendedLevel, bounds],
    );

    const [imageryStatus, setImageryStatus] = useState<ImageryStatus>('LOADING');
    const hasRenderedTilesRef = useRef(false);
    const fullyLoadedFiredRef = useRef(false);
    const onFullyLoadedRef = useRef(onFullyLoaded);
    onFullyLoadedRef.current = onFullyLoaded;

    // the preview is done as soon as the imagery it can show has settled: an unreachable
    // tile set must not hold the signal forever, the signalement PDF generation waits on it
    const settle = useCallback((status: Exclude<ImageryStatus, 'LOADING'>) => {
        setImageryStatus((current) => (current === 'LOADING' ? status : current));

        if (fullyLoadedFiredRef.current) {
            return;
        }
        fullyLoadedFiredRef.current = true;

        // let the tiles and the geometries be painted before the canvas is read back
        requestAnimationFrame(() => requestAnimationFrame(() => onFullyLoadedRef.current?.()));
    }, []);

    const quietTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        hasRenderedTilesRef.current = false;
        setImageryStatus('LOADING');

        const timeout = setTimeout(
            () => settle(hasRenderedTilesRef.current ? 'LOADED' : 'UNAVAILABLE'),
            IMAGERY_TIMEOUT_MS,
        );

        return () => {
            clearTimeout(timeout);

            if (quietTimeoutRef.current) {
                clearTimeout(quietTimeoutRef.current);
                quietTimeoutRef.current = null;
            }
        };
        // deliberately not re-run on a camera change: re-framing cannot change whether this
        // tile set has imagery here, and tiles already held by the source are served from
        // its cache without emitting the events this relies on
    }, [tileSet.url, settle]);

    // isSourceLoaded turns true whether the tiles arrived or failed, so what separates
    // "imagery displayed" from "nothing to show" is a tile event that is not an error one
    // (a 404 tile reports itself with sourceDataType 'error' and still carries its tile)
    const handleSourceData = useCallback((event: MapSourceDataEvent) => {
        if (
            event.sourceId === RASTER_SOURCE_ID &&
            event.sourceDataType !== 'error' &&
            (event as { tile?: unknown }).tile
        ) {
            hasRenderedTilesRef.current = true;
        }
    }, []);

    // every tile that lands repaints, which pushes the settle back until nothing moves anymore
    const handleRender = useCallback(() => {
        if (!quietTimeoutRef.current) {
            return;
        }

        clearTimeout(quietTimeoutRef.current);
        quietTimeoutRef.current = null;
    }, []);

    const handleIdle = useCallback(
        (event: MapEvent) => {
            const map = event.target;

            if (fullyLoadedFiredRef.current) {
                return;
            }

            // idle also fires before the raster source has been added to the style
            if (!map.getSource(RASTER_SOURCE_ID) || !map.isSourceLoaded(RASTER_SOURCE_ID)) {
                return;
            }

            if (quietTimeoutRef.current) {
                clearTimeout(quietTimeoutRef.current);
            }

            quietTimeoutRef.current = setTimeout(() => {
                quietTimeoutRef.current = null;
                settle(hasRenderedTilesRef.current ? 'LOADED' : 'UNAVAILABLE');
            }, IDLE_QUIET_PERIOD_MS);
        },
        [settle],
    );

    // initialViewState frames the map on creation; this only re-frames it when the zoom
    // controls widen the bbox
    const fitBoundsOptionsRef = useRef(fitBoundsOptions);
    fitBoundsOptionsRef.current = fitBoundsOptions;

    useEffect(() => {
        mapRef.current?.fitBounds(bounds_, {
            animate: false,
            ...fitBoundsOptionsRef.current,
        });
    }, [bounds_]);

    const { hovered: previewHovered, ref: previewRef } = useHover();

    return (
        <div
            className={clsx(classes['detection-tile-preview-wrapper'], classNames?.wrapper, {
                [classes['no-controls']]: !controlsDisplayed?.length,
            })}
        >
            <div className={clsx(classes['detection-tile-preview-container'], classNames?.main)} ref={previewRef}>
                {controlsDisplayed?.length && previewHovered ? (
                    <Overlay blur={4} backgroundOpacity={0} className={classes['detection-tile-preview-controls']}>
                        {controlsDisplayed.includes('ZOOM') ? (
                            <>
                                <Tooltip label="Dézoomer l'aperçu" position="bottom">
                                    <ActionIcon
                                        variant="filled"
                                        onClick={() => setCurrentExtendedLevel((prev) => prev + 1)}
                                    >
                                        <IconZoomOut size={16} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Zoomer l'aperçu" position="bottom">
                                    <ActionIcon
                                        variant="filled"
                                        onClick={() => setCurrentExtendedLevel((prev) => prev - 1)}
                                        disabled={currentExtendedLevel === 0}
                                    >
                                        <IconZoomIn size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </>
                        ) : null}
                        {controlsDisplayed.includes('EDIT') ? (
                            <Tooltip label="Editer la détection" position="bottom">
                                <ActionIcon variant="filled" onClick={() => editDetection && editDetection()}>
                                    <IconPencil size={16} />
                                </ActionIcon>
                            </Tooltip>
                        ) : null}
                    </Overlay>
                ) : null}
                {imageryStatus === 'UNAVAILABLE' ? (
                    <div className={classes['detection-tile-preview-unavailable']}>
                        <IconPhotoOff size={18} />
                        <span>Imagerie indisponible</span>
                    </div>
                ) : null}
                <div className={clsx(classes['detection-tile-preview'], classNames?.inner)}>
                    <Map
                        // only needed where the canvas is read back to build the signalement PDF
                        preserveDrawingBuffer={!!onFullyLoaded}
                        ref={mapRef}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle={PREVIEW_MAP_STYLE}
                        interactive={false}
                        reuseMaps={reuseMaps}
                        initialViewState={{ bounds: bounds_, fitBoundsOptions }}
                        onSourceData={handleSourceData}
                        onRender={handleRender}
                        onIdle={handleIdle}
                        {...(id ? { id } : {})}
                    >
                        <Source
                            type="geojson"
                            id={GEOJSON_SOURCE_ID}
                            data={{
                                type: 'FeatureCollection',
                                features: (geometries || []).map(({ geometry, color }) => ({
                                    type: 'Feature',
                                    properties: {
                                        color: color,
                                    },
                                    geometry: geometry,
                                })),
                            }}
                        >
                            <Layer
                                id={GEOJSON_LAYER_ID}
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 3,
                                    // an empty dasharray is not a valid pattern, omit it instead
                                    ...(strokedLine ? { 'line-dasharray': [2, 2] } : {}),
                                }}
                            />
                        </Source>

                        <Source
                            id={RASTER_SOURCE_ID}
                            scheme={tileSet.tileSetScheme}
                            type="raster"
                            tiles={[tileSet.url]}
                            tileSize={256}
                            // the zoom range belongs on the source, where it declares which
                            // levels exist so mapbox upsamples the deepest tiles above
                            // maxzoom. Without it the preview requests its exact zoom level
                            // and shows nothing when the tile set stops lower. On the layer
                            // the same keys mean something else: the map zoom range in which
                            // to draw at all, maxzoom exclusive, which would hide the
                            // imagery this is meant to reveal.
                            {...(tileSet.maxZoom ? { maxzoom: tileSet.maxZoom } : {})}
                            {...(tileSet.minZoom ? { minzoom: tileSet.minZoom } : {})}
                        >
                            <Layer
                                beforeId={GEOJSON_LAYER_ID}
                                id={RASTER_LAYER_ID}
                                type="raster"
                                source={RASTER_SOURCE_ID}
                                paint={{
                                    'raster-saturation': tileSet.monochrome ? -1 : 0,
                                    'raster-opacity-transition': {
                                        duration: 0,
                                        delay: 0,
                                    },
                                    'raster-fade-duration': 0,
                                }}
                            />
                        </Source>

                        {pinPosition ? (
                            <Source
                                type="geojson"
                                id={PIN_SOURCE_ID}
                                data={{ type: 'Point', coordinates: pinPosition }}
                            >
                                <Layer
                                    id={PIN_LAYER_ID}
                                    type="symbol"
                                    layout={{
                                        'text-field': '+',
                                        'text-size': 96,
                                        'text-allow-overlap': true,
                                        'text-ignore-placement': true,
                                    }}
                                    paint={{
                                        'text-color': '#FF0000',
                                    }}
                                />
                            </Source>
                        ) : null}
                    </Map>
                </div>
            </div>

            {displayName ? (
                <p className={classes['detection-tile-preview-date']}>{formatDateOnly(tileSet.date, 'yyyy')}</p>
            ) : null}
        </div>
    );
};

export default Component;
