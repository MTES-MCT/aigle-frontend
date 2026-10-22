import React, { useId, useMemo, useState } from 'react';

import Collapse from '@/components/dsfr/Collapse';
import LayerRow from '@/components/Map/MapSidePanel/LayersPanel/LayerRow';
import SortableLayerRows from '@/components/Map/MapSidePanel/LayersPanel/SortableLayerRows';
import { getZoneLayerTrackingName } from '@/components/Map/utils/tracking';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { TileSetType } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import { TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { getCustomZoneLayerKey } from '@/utils/layers-order';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import clsx from 'clsx';
import classes from './index.module.scss';

type OverlayTileSetType = Exclude<TileSetType, 'BACKGROUND'>;

type LayersMap = Record<OverlayTileSetType, MapTileSetLayer[]>;

const TILE_SET_TYPE_ICONS: Record<OverlayTileSetType, string> = {
    PARTIAL: 'fr-icon-image-line',
    INDICATIVE: 'fr-icon-road-map-line',
};

interface SectionProps extends React.PropsWithChildren {
    title: string;
    // whether at least one of its layers is shown: the eye then hides them all, otherwise shows them all
    anyDisplayed: boolean;
    onToggleDisplayed: (displayed: boolean) => void;
}

const Section: React.FC<SectionProps> = ({ title, anyDisplayed, onToggleDisplayed, children }: SectionProps) => {
    const contentId = `layers-section-${useId()}`;
    const [expanded, setExpanded] = useState(true);
    const toggleLabel = anyDisplayed ? `Masquer toutes les couches ${title}` : `Afficher toutes les couches ${title}`;

    return (
        <section>
            <div className={classes['section-header']}>
                {/* the slot of a drag handle: the groups do not move, but the folder lines up with the thumbnails */}
                <span className={classes['section-handle-slot']} aria-hidden="true" />
                <span className={clsx(classes['section-vignette'], 'fr-icon-folder-2-line')} aria-hidden="true" />
                <h3 className={classes['section-title']}>{title}</h3>
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                        anyDisplayed ? 'fr-icon-eye-line' : 'fr-icon-eye-off-line',
                    )}
                    title={toggleLabel}
                    onClick={() => onToggleDisplayed(!anyDisplayed)}
                >
                    {toggleLabel}
                </button>
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                        expanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line',
                    )}
                    title={expanded ? `Replier ${title}` : `Déplier ${title}`}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => setExpanded((previous) => !previous)}
                >
                    {expanded ? `Replier ${title}` : `Déplier ${title}`}
                </button>
            </div>
            <Collapse id={contentId} expanded={expanded}>
                <div className={classes['section-content']}>{children}</div>
            </Collapse>
        </section>
    );
};

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
        setTileSetsVisibility,
        setCustomZoneVisibility,
        setCustomZoneOpacity,
        moveTileSetLayer,
        moveCustomZoneLayer,
        annotationLayerVisible,
        setAnnotationLayerVisibility,
        settings,
    } = useMap();

    // The orthos are switched with the year selector, and the admin can leave a tile set out of the panel.
    const layersMap: LayersMap = useMemo(
        () =>
            layers
                .filter(({ tileSet }) => tileSet.tileSetType !== 'BACKGROUND' && tileSet.shownInLayersPanel !== false)
                .reduce<LayersMap>(
                    (prev, curr) => {
                        prev[curr.tileSet.tileSetType as OverlayTileSetType].push(curr);
                        return prev;
                    },
                    { PARTIAL: [], INDICATIVE: [] },
                ),
        [layers],
    );

    // From the rows only: the add-object tool also resets the layers through the store.
    const trackLayerToggled = (visible: boolean, layerName: string) => {
        if (tracked) {
            trackEvent(TRACKING_CATEGORIES.mapLayers, 'Couche modifiée', `${visible ? '+' : '-'}${layerName}`);
        }
    };

    const trackSectionToggled = (visible: boolean, sectionName: string) => {
        if (tracked) {
            trackEvent(
                TRACKING_CATEGORIES.mapLayers,
                'Groupe de couches modifié',
                `${visible ? '+' : '-'}${sectionName}`,
            );
        }
    };

    const setTileSetLayersDisplayed = (type: OverlayTileSetType, displayed: boolean) =>
        setTileSetsVisibility(
            layersMap[type].map(({ tileSet }) => tileSet.uuid),
            displayed,
        );

    const indicativeTileSetsShown = displayLayersSelection ? layersMap.INDICATIVE : [];

    const renderTileSetRows = (type: OverlayTileSetType) => (
        <SortableLayerRows
            items={layersMap[type]}
            getKey={({ tileSet }) => tileSet.uuid}
            getName={({ tileSet }) => tileSet.name}
            onMove={(layer, target) => moveTileSetLayer(layer.tileSet.uuid, target.tileSet.uuid)}
            renderRow={(layer, sortable) => (
                <LayerRow
                    name={layer.tileSet.name}
                    icon={TILE_SET_TYPE_ICONS[type]}
                    displayed={layer.displayed}
                    sortable={sortable}
                    onToggleDisplayed={(displayed) => {
                        trackLayerToggled(displayed, `${layer.tileSet.tileSetType} : ${layer.tileSet.name}`);
                        setTileSetVisibility(layer.tileSet.uuid, displayed);
                    }}
                />
            )}
        />
    );

    return (
        <>
            {displayLayersSelection && layersMap.PARTIAL.length ? (
                <Section
                    title={TILE_SET_TYPES_NAMES_MAP.PARTIAL}
                    anyDisplayed={layersMap.PARTIAL.some(({ displayed }) => displayed)}
                    onToggleDisplayed={(displayed) => {
                        trackSectionToggled(displayed, TILE_SET_TYPES_NAMES_MAP.PARTIAL);
                        setTileSetLayersDisplayed('PARTIAL', displayed);
                    }}
                >
                    {renderTileSetRows('PARTIAL')}
                </Section>
            ) : null}

            <Section
                title={TILE_SET_TYPES_NAMES_MAP.INDICATIVE}
                anyDisplayed={!!annotationLayerVisible || indicativeTileSetsShown.some(({ displayed }) => displayed)}
                onToggleDisplayed={(displayed) => {
                    trackSectionToggled(displayed, TILE_SET_TYPES_NAMES_MAP.INDICATIVE);
                    setAnnotationLayerVisibility(displayed);
                    if (displayLayersSelection) {
                        setTileSetLayersDisplayed('INDICATIVE', displayed);
                    }
                }}
            >
                {/* first and not movable: a vector layer, always drawn above the images */}
                <LayerRow
                    name="Grille d'annotation"
                    icon="fr-icon-layout-grid-line"
                    displayed={!!annotationLayerVisible}
                    pinned
                    onToggleDisplayed={(isDisplayed) => {
                        trackLayerToggled(isDisplayed, 'Grille d’annotation');
                        setAnnotationLayerVisibility(isDisplayed);
                    }}
                />
                {displayLayersSelection ? renderTileSetRows('INDICATIVE') : null}
            </Section>

            {customZoneLayers.length ? (
                <Section
                    title="Zones à enjeux"
                    anyDisplayed={customZoneLayers.some(({ displayed }) => displayed)}
                    onToggleDisplayed={(displayed) => {
                        trackSectionToggled(displayed, 'Zones à enjeux');
                        customZoneLayers.forEach(({ customZoneUuids }) =>
                            setCustomZoneVisibility(customZoneUuids, displayed),
                        );
                    }}
                >
                    <SortableLayerRows
                        items={customZoneLayers}
                        getKey={getCustomZoneLayerKey}
                        getName={({ name }) => name}
                        onMove={(layer, target) => moveCustomZoneLayer(layer.customZoneUuids, target.customZoneUuids)}
                        renderRow={({ name, color, customZoneUuids, displayed, opacity, description }, sortable) => (
                            <LayerRow
                                name={name}
                                color={color}
                                displayed={displayed}
                                opacity={opacity}
                                description={description}
                                sortable={sortable}
                                onToggleDisplayed={(isDisplayed) => {
                                    trackLayerToggled(
                                        isDisplayed,
                                        `Zone : ${getZoneLayerTrackingName({ name, customZoneUuids }, settings)}`,
                                    );
                                    setCustomZoneVisibility(customZoneUuids, isDisplayed);
                                }}
                                onOpacityChange={(value) => setCustomZoneOpacity(customZoneUuids, value)}
                            />
                        )}
                    />
                </Section>
            ) : null}
        </>
    );
};

export default Component;
