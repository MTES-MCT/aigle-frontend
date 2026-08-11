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
    /** Makes `opened` a controlled prop — without it the accordion owns its own state. */
    onOpenedChange?: (opened: boolean) => void;
    title?: React.ReactNode;
    icon?: React.ReactNode;
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({
    children,
    indicatorShown,
    className,
    opened,
    onOpenedChange,
    title = 'Filtres',
    icon = <IconAdjustments />,
}: PropsWithChildren<ComponentProps>) => {
    const controlled = onOpenedChange
        ? {
              value: opened ? ACCORDION_ITEM_VALUE : null,
              onChange: (value: string | null) => onOpenedChange(value === ACCORDION_ITEM_VALUE),
          }
        : { defaultValue: opened ? ACCORDION_ITEM_VALUE : undefined };

    return (
        <Accordion className={clsx(classes.container, className)} variant="contained" {...controlled}>
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
