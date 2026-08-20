import React, { useEffect, useId, useMemo, useState } from 'react';

import LayerRow from '@/components/Map/MapSidePanel/LayersPanel/LayerRow';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType, tileSetTypes } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import { CUSTOM_ZONE_NEGATIVE_COLOR, CUSTOM_ZONE_NEGATIVE_OPACITY, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import classes from './index.module.scss';

type OverlayTileSetType = Exclude<TileSetType, 'BACKGROUND'>;

type LayersMap = Record<OverlayTileSetType, MapTileSetLayer[]>;

const TILE_SET_TYPE_ICONS: Record<OverlayTileSetType, string> = {
    PARTIAL: 'fr-icon-image-line',
    INDICATIVE: 'fr-icon-road-map-line',
};

interface SectionProps extends React.PropsWithChildren {
    title: string;
}

const Section: React.FC<SectionProps> = ({ title, children }: SectionProps) => (
    <section className={classes.section}>
        <h3 className={classes['section-title']}>{title}</h3>
        {children}
    </section>
);

interface ComponentProps {
    layers: MapTileSetLayer[];
    customZoneLayers: MapGeoCustomZoneLayer[];
    displayLayersSelection: boolean;
}

const Component: React.FC<ComponentProps> = ({ layers, customZoneLayers, displayLayersSelection }: ComponentProps) => {
    const {
        setTileSetVisibility,
        setCustomZoneVisibility,
        setCustomZoneOpacity,
        annotationLayerVisible,
        setAnnotationLayerVisibility,
        customZoneNegativeFilterVisible,
        setCustomZoneNegativeFilterVisibility,
        backgroundLayerYears,
        getBackgroundTileSetYearDisplayed,
        setBackgroundTileSetYearDisplayed,
        eventEmitter,
    } = useMap();
    const backgroundYearsGroupId = `background-years-${useId()}`;
    const [backgroundYearSelected, setBackgroundYearSelected] = useState<string>(
        getBackgroundTileSetYearDisplayed() || '',
    );

    const layersMap: LayersMap = useMemo(
        () =>
            layers
                .filter((layer) => layer.tileSet.tileSetType !== 'BACKGROUND')
                .reduce<LayersMap>(
                    (prev, curr) => {
                        prev[curr.tileSet.tileSetType as OverlayTileSetType].push(curr);
                        return prev;
                    },
                    { PARTIAL: [], INDICATIVE: [] },
                ),
        [layers],
    );

    useEffect(() => {
        const updateBackgroundYearSelected = () => {
            const yearDisplayed = getBackgroundTileSetYearDisplayed();

            if (yearDisplayed) {
                setBackgroundYearSelected(yearDisplayed);
            }
        };

        eventEmitter.on('LAYERS_UPDATED', updateBackgroundYearSelected);

        return () => {
            eventEmitter.off('LAYERS_UPDATED', updateBackgroundYearSelected);
        };
    }, [eventEmitter, getBackgroundTileSetYearDisplayed]);

    return (
        <>
            {displayLayersSelection ? (
                <>
                    <Section title={TILE_SET_TYPES_NAMES_MAP.BACKGROUND}>
                        <div className={classes['radio-list']} role="radiogroup" aria-label="Année du fond de carte">
                            {(backgroundLayerYears || []).map((year) => (
                                <div className="fr-radio-group fr-radio-group--sm" key={year}>
                                    <input
                                        type="radio"
                                        id={`${backgroundYearsGroupId}-${year}`}
                                        name={backgroundYearsGroupId}
                                        value={year}
                                        checked={backgroundYearSelected === year}
                                        onChange={() => setBackgroundTileSetYearDisplayed(year)}
                                    />
                                    <label className="fr-label" htmlFor={`${backgroundYearsGroupId}-${year}`}>
                                        {year}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {tileSetTypes
                        .filter((type): type is OverlayTileSetType => type !== 'BACKGROUND')
                        .map((type) =>
                            layersMap[type].length ? (
                                <Section key={type} title={TILE_SET_TYPES_NAMES_MAP[type]}>
                                    {layersMap[type].map((layer) => (
                                        <LayerRow
                                            key={layer.tileSet.uuid}
                                            name={layer.tileSet.name}
                                            icon={TILE_SET_TYPE_ICONS[type]}
                                            displayed={layer.displayed}
                                            onToggleDisplayed={(displayed) =>
                                                setTileSetVisibility(layer.tileSet.uuid, displayed)
                                            }
                                        />
                                    ))}
                                </Section>
                            ) : null,
                        )}
                </>
            ) : null}

            <Section title="Zones à enjeux">
                {customZoneLayers.map(({ name, color, customZoneUuids, displayed, opacity, description }) => (
                    <LayerRow
                        key={customZoneUuids.join(',')}
                        name={name}
                        color={color}
                        displayed={displayed}
                        opacity={opacity}
                        description={description}
                        onToggleDisplayed={(isDisplayed) => setCustomZoneVisibility(customZoneUuids, isDisplayed)}
                        onOpacityChange={(value) => setCustomZoneOpacity(customZoneUuids, value)}
                    />
                ))}
                <LayerRow
                    name="Zones exclues par les filtres"
                    color={CUSTOM_ZONE_NEGATIVE_COLOR}
                    opacity={CUSTOM_ZONE_NEGATIVE_OPACITY}
                    displayed={!!customZoneNegativeFilterVisible}
                    onToggleDisplayed={setCustomZoneNegativeFilterVisibility}
                />
            </Section>

            <Section title="Annotation">
                <LayerRow
                    name="Grille d'annotation"
                    icon="fr-icon-layout-grid-line"
                    displayed={!!annotationLayerVisible}
                    onToggleDisplayed={setAnnotationLayerVisibility}
                />
            </Section>
        </>
    );
};

export default Component;
