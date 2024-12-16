import { Uuided } from '@/models/data';
import { Badge, Button, Group, ScrollArea } from '@mantine/core';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

interface ItemPillProps<T extends Uuided> {
    item: T;
    toLink?: (item: T) => string;
    getLabel: (item: T) => string;
    getLeftSection?: (item: T) => React.ReactNode;
}

const ItemPill = <T extends Uuided>({ item, toLink, getLabel, getLeftSection }: ItemPillProps<T>) => {
    if (!toLink) {
        return (
            <Badge
                className={classes['badge']}
                color="gray"
                leftSection={getLeftSection ? getLeftSection(item) : undefined}
            >
                {getLabel(item)}
            </Badge>
        );
    }

    return (
        <Button
            className={classes['pill']}
            component={Link}
            autoContrast
            radius={100}
            key={item.uuid}
            to={toLink(item)}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            size="compact-xs"
            color="gray"
            leftSection={getLeftSection ? getLeftSection(item) : undefined}
        >
            {getLabel(item)}
        </Button>
    );
};

interface ComponentProps<T extends Uuided> {
    items: T[];
    toLink?: (item: T) => string;
    getLabel: (item: T) => string;
    getLeftSection?: (item: T) => React.ReactNode;
}
const Component = <T extends Uuided>({ items, toLink, getLabel, getLeftSection }: ComponentProps<T>) => {
    return (
        <ScrollArea scrollbars="x" offsetScrollbars>
            <Group
                gap="xs"
                className={clsx(classes['pills-cell'], {
                    [classes['not-clickable']]: !toLink,
                })}
            >
                {items.map((item) => (
                    <ItemPill<T>
                        key={item.uuid}
                        item={item}
                        toLink={toLink}
                        getLabel={getLabel}
                        getLeftSection={getLeftSection}
                    />
                ))}
            </Group>
        </ScrollArea>
    );
};

export default Component;
