import { UserActivityStatus } from '@/models/ddtm-activity';
import { Badge } from '@mantine/core';
import React from 'react';
import { ACTIVITY_TIERS, tierCssColor } from './activity';
import classes from './index.module.scss';

/**
 * Filled, not light: the tier ramp is a single hue, and Mantine's light variant collapses
 * every shade above 6 onto the same text color — pilots and recurrents would look alike.
 * autoContrast picks black or white text against the step it is given.
 */
export const ActivityBadge: React.FC<{ status: UserActivityStatus }> = ({ status }) => (
    <Badge variant="filled" radius="sm" autoContrast color={ACTIVITY_TIERS[status].color}>
        {ACTIVITY_TIERS[status].label}
    </Badge>
);

export const CountBadge: React.FC<{ count: number; color: string }> = ({ count, color }) => (
    <Badge variant="filled" radius="sm" autoContrast color={color}>
        {count}
    </Badge>
);

/** The tier's chart color as a small square, for the legend card and the detail sections. */
export const TierSwatch: React.FC<{ tier: UserActivityStatus }> = ({ tier }) => (
    <span className={classes['tier-swatch']} style={{ '--tier-color': tierCssColor(tier) } as React.CSSProperties} />
);
