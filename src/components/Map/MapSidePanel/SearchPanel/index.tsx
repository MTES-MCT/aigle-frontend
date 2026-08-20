import React from 'react';

import Accordion from '@/components/dsfr/Accordion';
import AddressSearch from '@/components/Map/MapSidePanel/SearchPanel/AddressSearch';
import ParcelSearch from '@/components/Map/MapSidePanel/SearchPanel/ParcelSearch';
import { useExpandedSections } from '@/hooks/useExpandedSections';

type Section = 'ADDRESS' | 'PARCEL';

const ALL_SECTIONS: readonly Section[] = ['ADDRESS', 'PARCEL'] as const;

interface ComponentProps {
    onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({ onClose }: ComponentProps) => {
    const { isExpanded, toggleSection } = useExpandedSections(ALL_SECTIONS);

    return (
        <div className="fr-accordions-group">
            <Accordion
                title="Recherche simple"
                expanded={isExpanded('ADDRESS')}
                onToggle={(expanded) => toggleSection('ADDRESS', expanded)}
            >
                <AddressSearch />
            </Accordion>
            <Accordion
                title="Recherche par parcelle"
                expanded={isExpanded('PARCEL')}
                onToggle={(expanded) => toggleSection('PARCEL', expanded)}
            >
                <ParcelSearch onSearched={onClose} />
            </Accordion>
        </div>
    );
};

export default Component;
