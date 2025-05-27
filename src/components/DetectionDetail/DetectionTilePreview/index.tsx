import { TileSet } from '@/models/tile-set';
import { MAPBOX_TOKEN } from '@/utils/constants';
import { extendBbox } from '@/utils/geojson';
import { ActionIcon, Overlay, Tooltip } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { IconPencil, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Polygon, Position } from 'geojson';
import React, { useEffect, useRef, useState } from 'react';
import Map, { Layer, MapRef, Source } from 'react-map-gl';
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

const GEOJSON_LAYER_ID = 'geojson-layer';
const PIN_LAYER_ID = 'pin-layer';

type PreviewControl = 'ZOOM' | 'EDIT';

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
    onIdle?: () => void;
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
    onIdle,
    reuseMaps = true,
    pinPosition,
    fitBoundsOptions,
}) => {
    const mapRef = useRef<MapRef>();
    const [currentExtendedLevel, setCurrentExtendedLevel] = useState(extendedLevel);
    const bounds_ = currentExtendedLevel ? extendBbox(bounds, currentExtendedLevel) : bounds;

    useEffect(() => {
        if (!mapRef.current) {
            return;
        }

        mapRef.current.fitBounds(bounds_, {
            animate: false,
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
                <div className={clsx(classes['detection-tile-preview'], classNames?.inner)}>
                    <Map
                        preserveDrawingBuffer
                        ref={mapRef}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/streets-v11"
                        interactive={false}
                        reuseMaps={reuseMaps}
                        bounds={bounds_}
                        fitBoundsOptions={fitBoundsOptions}
                        {...(id ? { id } : {})}
                        {...(onIdle ? { onIdle } : {})}
                    >
                        <Source type="geojson" data={{ type: 'Point', coordinates: pinPosition }}>
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
                        <Source
                            type="geojson"
                            id="geojson-data"
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
                                beforeId={PIN_LAYER_ID}
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 3,
                                    'line-dasharray': strokedLine ? [2, 2] : [],
                                }}
                            />
                        </Source>

                        <Source
                            id="raster-source"
                            scheme={tileSet.tileSetScheme}
                            type="raster"
                            tiles={[tileSet.url]}
                            tileSize={256}
                        >
                            <Layer
                                beforeId={GEOJSON_LAYER_ID}
                                id="raster-layer"
                                type="raster"
                                source="raster-source"
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
                    </Map>
                </div>
            </div>

            {displayName ? (
                <p className={classes['detection-tile-preview-date']}>{format(tileSet.date, 'yyyy')}</p>
            ) : null}
        </div>
    );
};

export default Component;
