import React, { PropsWithChildren } from 'react';

import { Accordion, Indicator } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import clsx from 'clsx';
import classes from './index.module.scss';

const ACCORDION_ITEM_VALUE = 'accordion-item';

interface ComponentProps {
    indicatorShown?: boolean;
    className?: string;
    opened?: boolean;
    title?: string;
    icon?: React.ReactNode;
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({
    children,
    indicatorShown,
    className,
    opened,
    title = 'Filtres',
    icon = <IconAdjustments />,
}: PropsWithChildren<ComponentProps>) => {
    return (
        <Accordion
            className={clsx(classes.container, className)}
            variant="contained"
            defaultValue={opened ? ACCORDION_ITEM_VALUE : undefined}
        >
            <Accordion.Item key={ACCORDION_ITEM_VALUE} value={ACCORDION_ITEM_VALUE}>
                <Accordion.Control icon={<Indicator disabled={!indicatorShown}>{icon}</Indicator>}>
                    {title}
                </Accordion.Control>
                <Accordion.Panel className={classes.content}>{children}</Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
};

export default Component;
