import React from 'react';

import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { Section } from '@/models/ui/section';
import RunCommandExecute from '@/routes/admin/run-command/RunCommandExecute';
import RunCommandTasks from '@/routes/admin/run-command/RunCommandTasks';
import { Button } from '@mantine/core';

const SECTIONS_DISPLAYED: Section[] = [
    {
        title: 'Executer une commande',
        titleCompact: 'Exécuter',
        id: 'RUN_COMMAND_EXECUTE',
    },
    {
        title: 'Liste des tâches',
        titleCompact: 'Tâches',
        id: 'RUN_COMMAND_TASKS',
    },
];

const Component: React.FC = () => {
    const [sectionSelected, setSectionSelected] = React.useState<Section>(SECTIONS_DISPLAYED[0]);

    return (
        <LayoutAdminBase title={sectionSelected.title}>
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

            {sectionSelected.id === 'RUN_COMMAND_EXECUTE' ? <RunCommandExecute /> : null}
            {sectionSelected.id === 'RUN_COMMAND_TASKS' ? <RunCommandTasks /> : null}
        </LayoutAdminBase>
    );
};

export default Component;
