import React, { useEffect, useMemo, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType, tileSetTypes } from '@/models/tile-set';
import { TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { Checkbox, Radio, Stack } from '@mantine/core';
import { IconBoxMultiple } from '@tabler/icons-react';
import classes from './index.module.scss';

const CONTROL_LABEL = 'Affichage des couches';

type LayersMap = Record<Exclude<TileSetType, 'BACKGROUND'>, MapTileSetLayer[]>;

interface ComponentInnerProps {
    layers: MapTileSetLayer[];
    customZoneLayers: MapGeoCustomZoneLayer[];
    displayLayersSelection: boolean;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ layers, customZoneLayers, displayLayersSelection }) => {
    const {
        setTileSetVisibility,
        setCustomZoneVisibility,
        annotationLayerVisible,
        setAnnotationLayerVisibility,
        customZoneNegativeFilterVisible,
        setCustomZoneNegativeFilterVisibility,
        backgroundLayerYears,
        getBackgroundTileSetYearDisplayed,
        setBackgroundTileSetYearDisplayed,
        eventEmitter,
    } = useMap();
    const [backgroundTileSetYearSelected, setBackgroundTileSetYearSelected] = useState<string>(
        getBackgroundTileSetYearDisplayed() || '',
    );

    const layersMap: LayersMap = useMemo(
        () =>
            layers
                .filter((layer) => layer.tileSet.tileSetType !== 'BACKGROUND')
                .reduce<LayersMap>(
                    (prev, curr) => {
                        // @ts-expect-error TS7053
                        prev[curr.tileSet.tileSetType].push(curr);
                        return prev;
                    },
                    {
                        PARTIAL: [],
                        INDICATIVE: [],
                    },
                ),
        [layers],
    );
    useEffect(() => {
        const updateBackgrendLayerSelected = () => {
            const yearDisplayed = getBackgroundTileSetYearDisplayed();

            if (!yearDisplayed) {
                return;
            }

            setBackgroundTileSetYearSelected(yearDisplayed);
        };

        eventEmitter.on('LAYERS_UPDATED', updateBackgrendLayerSelected);

        return () => {
            eventEmitter.off('LAYERS_UPDATED', updateBackgrendLayerSelected);
        };
    }, []);

    return (
        <>
            <h2>{CONTROL_LABEL}</h2>
            <div className={classes['layers-sections-container']}>
                {displayLayersSelection ? (
                    <>
                        <div className={classes['layers-section']}>
                            <h3 className={classes['layers-section-title']}>{TILE_SET_TYPES_NAMES_MAP.BACKGROUND}</h3>
                            <Radio.Group
                                value={backgroundTileSetYearSelected}
                                onChange={(year) => setBackgroundTileSetYearDisplayed(year)}
                            >
                                <Stack className={classes['layers-section-group']} gap="xs">
                                    {(backgroundLayerYears || []).map((year) => (
                                        <Radio key={year} label={year} value={year} />
                                    ))}
                                </Stack>
                            </Radio.Group>
                        </div>
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
                        {customZoneLayers.map(({ name, color, customZoneUuids, displayed }) => (
                            <Checkbox
                                key={customZoneUuids.join(',')}
                                checked={displayed}
                                label={<div className={classes['checkbox-label']}>{name}</div>}
                                color={color}
                                onChange={async (event) => {
                                    setCustomZoneVisibility(customZoneUuids, event.currentTarget.checked);
                                }}
                            />
                        ))}
                        <Checkbox
                            checked={customZoneNegativeFilterVisible}
                            label={
                                <div className={classes['checkbox-label']}>
                                    <i>Zones exclues par les filtres</i>
                                </div>
                            }
                            onChange={async (event) =>
                                setCustomZoneNegativeFilterVisibility(event.currentTarget.checked)
                            }
                        />
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
