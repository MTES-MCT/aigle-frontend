import React from 'react';

import AdminTabs, { AdminTab } from '@/components/admin/AdminTabs';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import BatchesTab from './BatchesTab';
import RunsTab from './RunsTab';
import ZaeTab from './ZaeTab';

const TABS: AdminTab[] = [
    { value: 'runs', label: 'Runs', content: <RunsTab /> },
    { value: 'batches', label: 'Batches', content: <BatchesTab /> },
    { value: 'zae', label: 'Zones à enjeux', content: <ZaeTab /> },
];

const TAB_INITIAL_VALUE = { tab: TABS[0].value };

const Component: React.FC = () => {
    const [{ tab }, setTab] = useUrlFilter(TAB_INITIAL_VALUE);

    return (
        <LayoutAdminBase title="Imports">
            <AdminTabs tabs={TABS} value={tab} onChange={(tab) => setTab({ tab })} />
        </LayoutAdminBase>
    );
};

export default Component;
