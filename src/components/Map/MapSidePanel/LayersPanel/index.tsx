import React, { useEffect, useId, useMemo, useState } from 'react';

import LayerRow from '@/components/Map/MapSidePanel/LayersPanel/LayerRow';
import { getBackgroundYearRank, getZoneLayerTrackingName } from '@/components/Map/utils/tracking';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType, tileSetTypes } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import { CUSTOM_ZONE_NEGATIVE_COLOR, CUSTOM_ZONE_NEGATIVE_OPACITY, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
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
    tracked: boolean;
}

const Component: React.FC<ComponentProps> = ({
    layers,
    customZoneLayers,
    displayLayersSelection,
    tracked,
}: ComponentProps) => {
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
        settings,
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

    // From the rows only: the add-object tool also resets the layers through the store.
    const trackLayerToggled = (visible: boolean, layerName: string) => {
        if (tracked) {
            trackEvent(TRACKING_CATEGORIES.mapLayers, 'Couche modifiée', `${visible ? '+' : '-'}${layerName}`);
        }
    };

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
                                        onChange={() => {
                                            if (tracked && year !== backgroundYearSelected) {
                                                trackEvent(
                                                    TRACKING_CATEGORIES.mapLayers,
                                                    'Année du fond de carte changée',
                                                    `${getBackgroundYearRank(year, backgroundLayerYears || [])} : Couches`,
                                                    Number(year),
                                                );
                                            }
                                            setBackgroundTileSetYearDisplayed(year);
                                        }}
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
                                            onToggleDisplayed={(displayed) => {
                                                trackLayerToggled(
                                                    displayed,
                                                    `${layer.tileSet.tileSetType} : ${layer.tileSet.name}`,
                                                );
                                                setTileSetVisibility(layer.tileSet.uuid, displayed);
                                            }}
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
                        onToggleDisplayed={(isDisplayed) => {
                            trackLayerToggled(
                                isDisplayed,
                                `Zone : ${getZoneLayerTrackingName({ name, customZoneUuids }, settings)}`,
                            );
                            setCustomZoneVisibility(customZoneUuids, isDisplayed);
                        }}
                        onOpacityChange={(value) => setCustomZoneOpacity(customZoneUuids, value)}
                    />
                ))}
                <LayerRow
                    name="Zones exclues par les filtres"
                    color={CUSTOM_ZONE_NEGATIVE_COLOR}
                    opacity={CUSTOM_ZONE_NEGATIVE_OPACITY}
                    displayed={!!customZoneNegativeFilterVisible}
                    onToggleDisplayed={(isDisplayed) => {
                        trackLayerToggled(isDisplayed, 'Zones exclues par les filtres');
                        setCustomZoneNegativeFilterVisibility(isDisplayed);
                    }}
                />
            </Section>

            <Section title="Annotation">
                <LayerRow
                    name="Grille d'annotation"
                    icon="fr-icon-layout-grid-line"
                    displayed={!!annotationLayerVisible}
                    onToggleDisplayed={(isDisplayed) => {
                        trackLayerToggled(isDisplayed, 'Grille d’annotation');
                        setAnnotationLayerVisibility(isDisplayed);
                    }}
                />
            </Section>
        </>
    );
};

export default Component;
