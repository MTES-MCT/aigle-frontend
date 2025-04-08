import React, { PropsWithChildren } from 'react';

import { Group, Table, UnstyledButton } from '@mantine/core';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    label: string;
}
const Component: React.FC<ComponentProps> = ({ children }: ComponentProps) => {
    return (
        <Table.Th className={classes.th}>
            <UnstyledButton className={classes.button}>
                <Group justify="space-between">
                    {children}
                    {/* <Icon size={16} stroke={1.5} /> */}
                </Group>
            </UnstyledButton>
        </Table.Th>
    );
};

export default Component;
