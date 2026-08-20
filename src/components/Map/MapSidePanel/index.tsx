import React, { useEffect, useState } from 'react';

import FilterObjects from '@/components/FilterObjects';
import LayersPanel from '@/components/Map/MapSidePanel/LayersPanel';
import SearchPanel from '@/components/Map/MapSidePanel/SearchPanel';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { getMatchingPresetId } from '@/utils/objects-filter-presets';
import clsx from 'clsx';
import classes from './index.module.scss';

export type MapSidePanelSection = 'SEARCH' | 'FILTER' | 'LAYERS';

// kept in sync with the `transition` on .panel: the content has to outlive the slide-out
const SLIDE_DURATION_MS = 250;

const SECTIONS: { id: MapSidePanelSection; title: string; icon: string }[] = [
    { id: 'SEARCH', title: 'Recherche', icon: 'fr-icon-search-line' },
    { id: 'FILTER', title: 'Filtres', icon: 'fr-icon-filter-line' },
    { id: 'LAYERS', title: 'Couches', icon: 'fr-icon-stack-line' },
];

interface ComponentProps {
    section?: MapSidePanelSection;
    setSection: (section?: MapSidePanelSection) => void;
    displayLayersSelection?: boolean;
    layersDisabled?: boolean;
}

const Component: React.FC<ComponentProps> = ({
    section,
    setSection,
    displayLayersSelection = true,
    layersDisabled = false,
}: ComponentProps) => {
    const { layers, customZoneLayers, objectTypes, otherObjectTypesUuids, annotationLayerVisible } = useMap();
    const { objectsFilter, updateObjectsFilter } = useObjectsFilter();
    // the panel slides out rather than unmounting, so it keeps rendering the section it is closing
    const [slidingSection, setSlidingSection] = useState(section);

    useEffect(() => {
        if (section) {
            setSlidingSection(section);
            return;
        }

        const timeout = setTimeout(() => setSlidingSection(undefined), SLIDE_DURATION_MS);

        return () => clearTimeout(timeout);
    }, [section]);

    if (!layers || !customZoneLayers || !objectTypes || !otherObjectTypesUuids || !objectsFilter) {
        return null;
    }

    const indicators: Record<MapSidePanelSection, boolean> = {
        SEARCH: false,
        FILTER: getMatchingPresetId(objectsFilter) !== 'DEFAULT',
        LAYERS: customZoneLayers.some(({ displayed }) => displayed) || !!annotationLayerVisible,
    };

    const renderContent = () => {
        switch (slidingSection) {
            case 'SEARCH':
                return <SearchPanel onClose={() => setSection(undefined)} />;
            case 'FILTER':
                return (
                    <FilterObjects
                        objectTypes={objectTypes}
                        objectsFilter={objectsFilter}
                        mapGeoCustomZoneLayers={customZoneLayers}
                        otherObjectTypesUuids={otherObjectTypesUuids}
                        updateObjectsFilter={updateObjectsFilter}
                    />
                );
            case 'LAYERS':
                return (
                    <LayersPanel
                        layers={layers}
                        customZoneLayers={customZoneLayers}
                        displayLayersSelection={displayLayersSelection}
                    />
                );
            default:
                return null;
        }
    };

    const slidingSectionTitle = SECTIONS.find(({ id }) => id === slidingSection)?.title;

    return (
        <div className={classes.container}>
            <div className={clsx(classes.panel, section && classes['panel-open'])} aria-hidden={!section}>
                <div className={classes['panel-header']}>
                    <h2 className={classes['panel-title']}>{slidingSectionTitle}</h2>
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
                        onClick={() => setSection(undefined)}
                    >
                        Fermer
                    </button>
                </div>
                {renderContent()}
            </div>

            <div className={classes.rail}>
                {SECTIONS.map(({ id, title, icon }) => {
                    const disabled = layersDisabled && id === 'LAYERS';

                    return (
                        <button
                            key={id}
                            type="button"
                            className={clsx(classes['rail-button'], section === id && classes['rail-button-active'])}
                            title={title}
                            aria-label={title}
                            aria-pressed={section === id}
                            disabled={disabled}
                            onClick={() => setSection(section === id ? undefined : id)}
                        >
                            <span className={icon} aria-hidden="true" />
                            {indicators[id] ? <span className={classes['rail-button-indicator']} /> : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Component;
