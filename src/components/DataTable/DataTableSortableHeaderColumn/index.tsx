import React, { PropsWithChildren } from 'react';

import { Table, UnstyledButton } from '@mantine/core';
import { IconArrowUp, IconSwitchVertical } from '@tabler/icons-react';
import clsx from 'clsx';
import classes from './index.module.scss';

const ICON_SIZE = 16;

export type SortOrder = 'asc' | 'desc';

interface IconProps {
    sortOrder?: SortOrder;
}

const Icon: React.FC<IconProps> = ({ sortOrder }) => {
    if (!sortOrder) {
        return <IconSwitchVertical size={ICON_SIZE} className={classes.icon} />;
    }

    return (
        <IconArrowUp
            size={ICON_SIZE}
            className={clsx(classes.icon, sortOrder === 'asc' ? classes.asc : classes.desc)}
        />
    );
};

interface ComponentProps extends PropsWithChildren {
    onOrderChange: (order?: SortOrder) => void;
    sortOrder?: SortOrder;
}
const Component: React.FC<ComponentProps> = ({ children, sortOrder, onOrderChange }: ComponentProps) => {
    return (
        <Table.Th className={classes.th}>
            <UnstyledButton
                className={classes.button}
                size="sm"
                onClick={() => {
                    if (sortOrder === 'asc') {
                        onOrderChange('desc');
                    } else if (sortOrder === 'desc') {
                        onOrderChange(undefined);
                    } else {
                        onOrderChange('asc');
                    }
                }}
            >
                {children}
                <div className={classes['icon-container']}>
                    <Icon sortOrder={sortOrder} />
                </div>
            </UnstyledButton>
        </Table.Th>
    );
};

export default Component;
