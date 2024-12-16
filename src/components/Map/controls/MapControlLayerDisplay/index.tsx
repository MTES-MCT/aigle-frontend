import React, { useMemo } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType, tileSetTypes } from '@/models/tile-set';
import { TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { Checkbox, Radio, Stack } from '@mantine/core';
import { IconBoxMultiple } from '@tabler/icons-react';
import classes from './index.module.scss';

const CONTROL_LABEL = 'Affichage des couches';

type LayersMap = Record<TileSetType, MapTileSetLayer[]>;

interface ComponentInnerProps {
    layers: MapTileSetLayer[];
    customZoneLayers: MapGeoCustomZoneLayer[];
    displayLayersSelection: boolean;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ layers, customZoneLayers, displayLayersSelection }) => {
    const { setTileSetVisibility, setCustomZoneVisibility, annotationLayerVisible, setAnnotationLayerVisibility } =
        useMap();

    const layersMap: LayersMap = useMemo(
        () =>
            layers.reduce<LayersMap>(
                (prev, curr) => {
                    prev[curr.tileSet.tileSetType].push(curr);
                    return prev;
                },
                {
                    BACKGROUND: [],
                    PARTIAL: [],
                    INDICATIVE: [],
                },
            ),
        [layers],
    );

    const backgroundTileSetUuidDisplayed = layersMap.BACKGROUND.find((layer) => layer.displayed)?.tileSet.uuid;

    return (
        <>
            <h2>{CONTROL_LABEL}</h2>
            <div className={classes['layers-sections-container']}>
                {displayLayersSelection ? (
                    <>
                        {layersMap.BACKGROUND.length ? (
                            <div className={classes['layers-section']}>
                                <h3 className={classes['layers-section-title']}>
                                    {TILE_SET_TYPES_NAMES_MAP.BACKGROUND}
                                </h3>
                                <Radio.Group
                                    value={backgroundTileSetUuidDisplayed}
                                    onChange={(uuid) => setTileSetVisibility(uuid, true)}
                                >
                                    <Stack className={classes['layers-section-group']} gap="xs">
                                        {layersMap.BACKGROUND.map((layer) => (
                                            <Radio
                                                key={layer.tileSet.uuid}
                                                label={layer.tileSet.name}
                                                value={layer.tileSet.uuid}
                                            />
                                        ))}
                                    </Stack>
                                </Radio.Group>
                            </div>
                        ) : null}
                        {tileSetTypes
                            .filter((type) => type !== 'BACKGROUND')
                            .map((type) =>
                                layersMap[type].length ? (
                                    <div key={type} className={classes['layers-section']}>
                                        <h3 className={classes['layers-section-title']}>
                                            {TILE_SET_TYPES_NAMES_MAP[type]}
                                        </h3>
                                        <Stack className={classes['layers-section-group']} gap="xs">
                                            {layersMap[type].map((layer) => (
                                                <Checkbox
                                                    key={layer.tileSet.uuid}
                                                    checked={layer.displayed}
                                                    label={layer.tileSet.name}
                                                    onChange={(event) =>
                                                        setTileSetVisibility(
                                                            layer.tileSet.uuid,
                                                            event.currentTarget.checked,
                                                        )
                                                    }
                                                />
                                            ))}
                                        </Stack>
                                    </div>
                                ) : null,
                            )}
                    </>
                ) : null}
                <div className={classes['layers-section']}>
                    <h3 className={classes['layers-section-title']}>Contours des zones à enjeux</h3>
                    <Stack className={classes['layers-section-group']} gap="xs">
                        {customZoneLayers.map((customZoneLayer) => (
                            <Checkbox
                                key={customZoneLayer.geoCustomZone.uuid}
                                checked={customZoneLayer.displayed}
                                label={
                                    <div className={classes['checkbox-label']}>
                                        {customZoneLayer.geoCustomZone.name}
                                    </div>
                                }
                                color={customZoneLayer.geoCustomZone.color}
                                onChange={async (event) => {
                                    setCustomZoneVisibility(
                                        customZoneLayer.geoCustomZone.uuid,
                                        event.currentTarget.checked,
                                    );
                                }}
                            />
                        ))}
                    </Stack>
                </div>
                <div className={classes['layers-section']}>
                    <h3 className={classes['layers-section-title']}>Annotation</h3>
                    <Stack className={classes['layers-section-group']} gap="xs">
                        <Checkbox
                            key="annotation"
                            checked={annotationLayerVisible}
                            label="Grille d'annotation"
                            onChange={(event) => setAnnotationLayerVisibility(event.currentTarget.checked)}
                        />
                    </Stack>
                </div>
            </div>
        </>
    );
};

interface ComponentProps {
    disabled?: boolean;
    isShowed: boolean;
    displayLayersSelection?: boolean;
    setIsShowed: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ isShowed, setIsShowed, disabled, displayLayersSelection = true }) => {
    const { layers, customZoneLayers } = useMap();

    if (!layers || !customZoneLayers) {
        return null;
    }

    return (
        <MapControlCustom
            controlInner={<IconBoxMultiple color="#777777" />}
            contentClassName={classes.content}
            containerClassName={classes.container}
            isShowed={isShowed}
            setIsShowed={setIsShowed}
            label={CONTROL_LABEL}
            disabled={disabled}
        >
            <ComponentInner
                layers={layers}
                customZoneLayers={customZoneLayers}
                displayLayersSelection={displayLayersSelection}
            />
        </MapControlCustom>
    );
};

export default Component;
