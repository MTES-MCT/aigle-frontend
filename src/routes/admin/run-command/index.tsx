import React from 'react';

import AdminTabs, { AdminTab } from '@/components/admin/AdminTabs';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import RunCommandExecute from '@/routes/admin/run-command/RunCommandExecute';
import RunCommandTasks from '@/routes/admin/run-command/RunCommandTasks';

// title = the page heading, label = the tab
const TABS: (AdminTab & { title: string })[] = [
    { value: 'execute', label: 'Exécuter', title: 'Exécuter une commande', content: <RunCommandExecute /> },
    { value: 'tasks', label: 'Tâches', title: 'Liste des tâches', content: <RunCommandTasks /> },
];

const TAB_INITIAL_VALUE = { tab: TABS[0].value };

const Component: React.FC = () => {
    const [{ tab }, setTab] = useUrlFilter(TAB_INITIAL_VALUE);
    const tabSelected = TABS.find(({ value }) => value === tab) ?? TABS[0];

    return (
        <LayoutAdminBase title={tabSelected.title}>
            <AdminTabs tabs={TABS} value={tab} onChange={(tab) => setTab({ tab })} />
        </LayoutAdminBase>
    );
};

export default Component;
