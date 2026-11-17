import React from 'react';

import { Table, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';

import classes from './index.module.scss';

type SortOrder = 'asc' | 'desc';

interface ComponentProps {
    children: React.ReactNode;
    // the API `ordering` value of this column, `-` prefixed when descending
    field: string;
    ordering: string;
    onChange: (ordering: string) => void;
    // numbers and rates read best highest first, names A to Z
    firstOrder?: SortOrder;
}

// Clicks cycle through the first order, the other one, then back to the list default ('').
const Component: React.FC<ComponentProps> = ({ children, field, ordering, onChange, firstOrder = 'desc' }) => {
    const order: SortOrder | null = ordering === field ? 'asc' : ordering === `-${field}` ? 'desc' : null;
    const toOrdering = (sortOrder: SortOrder) => (sortOrder === 'asc' ? field : `-${field}`);

    let next: string;
    if (order === null) {
        next = toOrdering(firstOrder);
    } else if (order === firstOrder) {
        next = toOrdering(firstOrder === 'asc' ? 'desc' : 'asc');
    } else {
        next = '';
    }

    const Icon = order === 'asc' ? IconArrowUp : order === 'desc' ? IconArrowDown : IconArrowsSort;

    return (
        <Table.Th aria-sort={order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : 'none'}>
            <UnstyledButton className={classes.button} onClick={() => onChange(next)}>
                <span>{children}</span>
                <Icon size={14} className={order ? classes['icon-active'] : classes.icon} aria-hidden />
            </UnstyledButton>
        </Table.Th>
    );
};

export default Component;
