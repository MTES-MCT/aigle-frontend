import React from 'react';

import { Tabs } from '@mantine/core';

export interface AdminTab {
    value: string;
    label: string;
    content: React.ReactNode;
}

interface ComponentProps {
    tabs: AdminTab[];
    value: string;
    onChange: (value: string) => void;
    // Off by default: a tab body often owns URL filter params, and several mounted at once
    // would overwrite each other's.
    keepMounted?: boolean;
}

const Component: React.FC<ComponentProps> = ({ tabs, value, onChange, keepMounted = false }) => {
    // a stale or hand-edited ?tab= would otherwise render no panel at all
    const valueSelected = tabs.some((tab) => tab.value === value) ? value : tabs[0].value;

    return (
        <Tabs value={valueSelected} onChange={(value) => value && onChange(value)} keepMounted={keepMounted}>
            <Tabs.List mb="md">
                {tabs.map((tab) => (
                    <Tabs.Tab key={tab.value} value={tab.value}>
                        {tab.label}
                    </Tabs.Tab>
                ))}
            </Tabs.List>

            {tabs.map((tab) => (
                <Tabs.Panel key={tab.value} value={tab.value}>
                    {tab.content}
                </Tabs.Panel>
            ))}
        </Tabs>
    );
};

export default Component;
