import React, { useState } from 'react';

import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { Section } from '@/models/ui/section';
import CustomZoneCategoryDataTable from '@/routes/admin/custom-zone/CustomZoneList/CustomZoneCategoryDataTable';
import CustomZoneDataTable from '@/routes/admin/custom-zone/CustomZoneList/CustomZoneDataTable';
import { Button } from '@mantine/core';
import { IconHexagonPlus2, IconHexagonalPrismPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const SECTIONS_DISPLAYED: Section[] = [
    {
        title: 'Liste des zones à enjeux',
        titleCompact: 'Zones à enjeux',
        id: 'CUSTOM_ZONES',
    },
    {
        title: 'Liste des catégories de zones à enjeux',
        titleCompact: 'Catégories',
        id: 'CUSTOM_ZONE_CATEGORIES',
    },
];

const Component: React.FC = () => {
    const [sectionSelected, setSectionSelected] = useState<Section>(SECTIONS_DISPLAYED[0]);

    return (
        <LayoutAdminBase
            title={sectionSelected.title}
            actions={
                <div>
                    <Button
                        leftSection={<IconHexagonalPrismPlus />}
                        variant="outline"
                        mr="md"
                        component={Link}
                        to="/admin/custom-zones/category-form"
                    >
                        Ajouter une catégorie
                    </Button>
                    <Button leftSection={<IconHexagonPlus2 />} component={Link} to="/admin/custom-zones/form">
                        Ajouter une zone
                    </Button>
                </div>
            }
        >
            <Button.Group className="admin-tabs">
                {SECTIONS_DISPLAYED.map((section) => (
                    <Button
                        className="admin-tab"
                        key={section.id}
                        variant={sectionSelected.id === section.id ? 'filled' : 'outline'}
                        onClick={() => setSectionSelected(section)}
                    >
                        {section.titleCompact}
                    </Button>
                ))}
            </Button.Group>

            {sectionSelected.id === 'CUSTOM_ZONES' ? <CustomZoneDataTable /> : null}
            {sectionSelected.id === 'CUSTOM_ZONE_CATEGORIES' ? <CustomZoneCategoryDataTable /> : null}
        </LayoutAdminBase>
    );
};

export default Component;
