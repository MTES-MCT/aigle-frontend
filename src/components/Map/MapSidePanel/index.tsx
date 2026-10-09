import React, { useMemo } from 'react';

import FilterObjects from '@/components/FilterObjects';
import LayersPanel from '@/components/Map/MapSidePanel/LayersPanel';
import SearchPanel from '@/components/Map/MapSidePanel/SearchPanel';
import SidePanel, { SidePanelSection } from '@/components/SidePanel';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { extractObjectTypesFromSettings } from '@/store/utils';
import { isObjectsFilterDefault } from '@/utils/objects-filter';
import { TRACKING_CATEGORIES } from '@/utils/tracking';

export type MapSidePanelSection = 'SEARCH' | 'FILTER' | 'LAYERS';

interface ComponentProps {
    section?: MapSidePanelSection;
    setSection: (section?: MapSidePanelSection) => void;
    displayLayersSelection?: boolean;
    layersDisabled?: boolean;
    tracked?: boolean;
    onFilterUserChange?: () => void;
}

const Component: React.FC<ComponentProps> = ({
    section,
    setSection,
    displayLayersSelection = true,
    layersDisabled = false,
    tracked = false,
    onFilterUserChange,
}: ComponentProps) => {
    const { layers, customZoneLayers, objectTypes, otherObjectTypesUuids, annotationLayerVisible, settings } = useMap();
    const { objectsFilter, updateObjectsFilter } = useObjectsFilter();
    const defaultObjectTypesUuids = useMemo(
        () => (settings ? Array.from(extractObjectTypesFromSettings(settings).visibleObjectTypesUuids) : []),
        [settings],
    );

    if (!layers || !customZoneLayers || !objectTypes || !otherObjectTypesUuids || !objectsFilter) {
        return null;
    }

    const sections: SidePanelSection<MapSidePanelSection>[] = [
        {
            id: 'SEARCH',
            title: 'Recherche',
            icon: 'fr-icon-search-line',
            content: <SearchPanel onClose={() => setSection(undefined)} tracked={tracked} />,
        },
        {
            id: 'FILTER',
            title: 'Filtres',
            icon: 'fr-icon-filter-line',
            indicator: !isObjectsFilterDefault(
                objectsFilter,
                defaultObjectTypesUuids,
                customZoneLayers.flatMap(({ customZoneUuids }) => customZoneUuids),
            ),
            content: (
                <FilterObjects
                    objectTypes={objectTypes}
                    objectsFilter={objectsFilter}
                    mapGeoCustomZoneLayers={customZoneLayers}
                    otherObjectTypesUuids={otherObjectTypesUuids}
                    updateObjectsFilter={updateObjectsFilter}
                    trackingCategory={tracked ? TRACKING_CATEGORIES.mapFilters : undefined}
                    onUserChange={onFilterUserChange}
                />
            ),
        },
        {
            id: 'LAYERS',
            title: 'Couches',
            icon: 'fr-icon-stack-line',
            indicator: customZoneLayers.some(({ displayed }) => displayed) || !!annotationLayerVisible,
            disabled: layersDisabled,
            content: (
                <LayersPanel
                    layers={layers}
                    customZoneLayers={customZoneLayers}
                    displayLayersSelection={displayLayersSelection}
                    tracked={tracked}
                />
            ),
        },
    ];

    return <SidePanel layout="overlay" sections={sections} section={section} setSection={setSection} />;
};

export default Component;
