import React, { useState } from 'react';

import AdminTabs, { AdminTab } from '@/components/admin/AdminTabs';
import BulkImportExportButtons from '@/components/admin/BulkImportExport';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { customZoneBulkConfig } from '@/routes/admin/custom-zone/CustomZoneList/bulkConfig';
import CustomZoneCategoryDataTable from '@/routes/admin/custom-zone/CustomZoneList/CustomZoneCategoryDataTable';
import CustomZoneDataTable from '@/routes/admin/custom-zone/CustomZoneList/CustomZoneDataTable';
import { Button } from '@mantine/core';
import { IconHexagonPlus2, IconHexagonalPrismPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';
import { CUSTOM_ZONE_DATA_FILTER_INITIAL_VALUE, CustomZoneDataFilter } from './types';

const CUSTOM_ZONES_TAB = 'custom-zones';
const TAB_INITIAL_VALUE = { tab: CUSTOM_ZONES_TAB };

const Component: React.FC = () => {
    const [{ tab }, setTab] = useUrlFilter(TAB_INITIAL_VALUE);
    const [filter, setFilter] = useState<CustomZoneDataFilter>(CUSTOM_ZONE_DATA_FILTER_INITIAL_VALUE);

    // title = the page heading, label = the tab
    const tabs: (AdminTab & { title: string })[] = [
        {
            value: CUSTOM_ZONES_TAB,
            label: 'Zones à enjeux',
            title: 'Liste des zones à enjeux',
            content: <CustomZoneDataTable filter={filter} onFilterChange={setFilter} />,
        },
        {
            value: 'categories',
            label: 'Catégories',
            title: 'Liste des catégories de zones à enjeux',
            content: <CustomZoneCategoryDataTable />,
        },
    ];
    const tabSelected = tabs.find(({ value }) => value === tab) ?? tabs[0];

    return (
        <LayoutAdminBase
            title={tabSelected.title}
            actions={
                <div className={classes.actions}>
                    {tabSelected.value === CUSTOM_ZONES_TAB ? (
                        <BulkImportExportButtons config={customZoneBulkConfig} exportParams={filter} />
                    ) : null}
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
            <AdminTabs tabs={tabs} value={tab} onChange={(tab) => setTab({ tab })} />
        </LayoutAdminBase>
    );
};

export default Component;
