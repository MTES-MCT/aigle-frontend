import React from 'react';

import { Paper, Text, ThemeIcon } from '@mantine/core';
import classes from './index.module.scss';

interface ComponentProps {
    icon: React.ReactNode;
    label: string;
    value: number;
}

const Component: React.FC<ComponentProps> = ({ icon, label, value }: ComponentProps) => (
    <Paper withBorder p="sm" radius="md" className={classes.stat}>
        <ThemeIcon variant="light" size="lg" radius="md">
            {icon}
        </ThemeIcon>
        <div>
            <Text className={classes['stat-value']} fw={700} fz={30}>
                {value}
            </Text>
            <Text className={classes['stat-label']} c="dimmed">
                {label}
            </Text>
        </div>
    </Paper>
);

export default Component;
