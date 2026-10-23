import React, { useId, useMemo, useState } from 'react';

import Collapse from '@/components/dsfr/Collapse';
import LayerRow, { LayerRowSortableProps } from '@/components/Map/MapSidePanel/LayersPanel/LayerRow';
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

// the annotation grid ranks among the indicative tile sets
type IndicativeRow = { kind: 'grid' } | { kind: 'tileSet'; layer: MapTileSetLayer };

const ANNOTATION_GRID_ROW_KEY = 'annotation-grid';
const ANNOTATION_GRID_NAME = "Grille d'annotation";

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
        annotationGridUnder,
        setAnnotationGridUnder,
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

    // the grid under the row of `annotationGridUnder`, on top when that row is gone
    const indicativeRows: IndicativeRow[] = useMemo(() => {
        const tileSetRows: IndicativeRow[] = indicativeTileSetsShown.map((layer) => ({ kind: 'tileSet', layer }));
        const gridIndex = indicativeTileSetsShown.findIndex(({ tileSet }) => tileSet.uuid === annotationGridUnder) + 1;
        tileSetRows.splice(gridIndex, 0, { kind: 'grid' });

        return tileSetRows;
    }, [indicativeTileSetsShown, annotationGridUnder]);

    const moveIndicativeRow = (row: IndicativeRow, target: IndicativeRow) => {
        const moved = [...indicativeRows];
        moved.splice(indicativeRows.indexOf(target), 0, ...moved.splice(indicativeRows.indexOf(row), 1));

        if (row.kind === 'tileSet' && target.kind === 'tileSet') {
            moveTileSetLayer(row.layer.tileSet.uuid, target.layer.tileSet.uuid);
        }

        const rowAboveGrid = moved[moved.findIndex(({ kind }) => kind === 'grid') - 1];
        setAnnotationGridUnder(rowAboveGrid?.kind === 'tileSet' ? rowAboveGrid.layer.tileSet.uuid : null);
    };

    const renderAnnotationGridRow = (sortable?: LayerRowSortableProps) => (
        <LayerRow
            name={ANNOTATION_GRID_NAME}
            icon="fr-icon-layout-grid-line"
            displayed={!!annotationLayerVisible}
            sortable={sortable}
            pinned={!sortable}
            onToggleDisplayed={(isDisplayed) => {
                trackLayerToggled(isDisplayed, 'Grille d’annotation');
                setAnnotationLayerVisibility(isDisplayed);
            }}
        />
    );

    const renderTileSetRow = (layer: MapTileSetLayer, sortable: LayerRowSortableProps) => (
        <LayerRow
            name={layer.tileSet.name}
            icon={TILE_SET_TYPE_ICONS[layer.tileSet.tileSetType as OverlayTileSetType]}
            displayed={layer.displayed}
            sortable={sortable}
            onToggleDisplayed={(displayed) => {
                trackLayerToggled(displayed, `${layer.tileSet.tileSetType} : ${layer.tileSet.name}`);
                setTileSetVisibility(layer.tileSet.uuid, displayed);
            }}
        />
    );

    const renderTileSetRows = (type: OverlayTileSetType) => (
        <SortableLayerRows
            items={layersMap[type]}
            getKey={({ tileSet }) => tileSet.uuid}
            getName={({ tileSet }) => tileSet.name}
            onMove={(layer, target) => moveTileSetLayer(layer.tileSet.uuid, target.tileSet.uuid)}
            renderRow={renderTileSetRow}
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
                {indicativeRows.length > 1 ? (
                    <SortableLayerRows
                        items={indicativeRows}
                        getKey={(row) => (row.kind === 'grid' ? ANNOTATION_GRID_ROW_KEY : row.layer.tileSet.uuid)}
                        getName={(row) => (row.kind === 'grid' ? ANNOTATION_GRID_NAME : row.layer.tileSet.name)}
                        onMove={moveIndicativeRow}
                        renderRow={(row, sortable) =>
                            row.kind === 'grid'
                                ? renderAnnotationGridRow(sortable)
                                : renderTileSetRow(row.layer, sortable)
                        }
                    />
                ) : (
                    renderAnnotationGridRow()
                )}
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
