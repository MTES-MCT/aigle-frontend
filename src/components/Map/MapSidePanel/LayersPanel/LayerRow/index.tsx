import Collapse from '@/components/dsfr/Collapse';
import Range from '@/components/dsfr/Range';
import { SortableRowProps } from '@/components/SortableRows';
import { getCustomZoneOpacities, withAlpha } from '@/utils/colors';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY } from '@/utils/constants';
import clsx from 'clsx';
import React, { useId, useState } from 'react';
import classes from './index.module.scss';

const formatOpacity = (opacity: number) => `${Math.round(opacity)} %`;

interface VisibilityButtonProps {
    displayed: boolean;
    // what a click does, e.g. « Masquer Zone agricole »
    label: string;
    onClick: () => void;
}

// the eye of a layer row or of a group header
export const VisibilityButton: React.FC<VisibilityButtonProps> = ({ displayed, label, onClick }) => (
    <button
        type="button"
        className={clsx(
            'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
            displayed ? 'fr-icon-eye-line' : 'fr-icon-eye-off-line',
        )}
        title={label}
        onClick={onClick}
    >
        {label}
    </button>
);

interface ExpandButtonProps {
    name: string;
    expanded: boolean;
    controls: string;
    onClick: () => void;
}

// the chevron that folds a layer row or a group
export const ExpandButton: React.FC<ExpandButtonProps> = ({ name, expanded, controls, onClick }) => {
    const label = expanded ? `Replier ${name}` : `Déplier ${name}`;

    return (
        <button
            type="button"
            className={clsx(
                'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                expanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line',
            )}
            title={label}
            aria-expanded={expanded}
            aria-controls={controls}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

interface ComponentProps {
    name: string;
    displayed: boolean;
    color?: string;
    icon?: string;
    description?: string | null;
    opacity?: number;
    sortable?: SortableRowProps;
    // in a sortable section without being movable itself: keeps the handle's slot so the rows line up
    pinned?: boolean;
    onToggleDisplayed: (displayed: boolean) => void;
    onOpacityChange?: (opacity: number) => void;
}

const Component: React.FC<ComponentProps> = ({
    name,
    displayed,
    color,
    icon,
    description,
    opacity,
    sortable,
    pinned,
    onToggleDisplayed,
    onOpacityChange,
}: ComponentProps) => {
    const detailsId = `layer-details-${useId()}`;
    const [expanded, setExpanded] = useState(false);
    const expandable = onOpacityChange !== undefined || !!description;
    const swatchOpacities = getCustomZoneOpacities(opacity ?? DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

    return (
        <div
            className={clsx(
                classes.layer,
                sortable?.dragged && classes['layer-dragged'],
                sortable?.dropPosition && classes[`layer-drop-${sortable.dropPosition}`],
            )}
            draggable={sortable?.draggable}
            onDragStart={sortable?.onDragStart}
            onDragOver={sortable?.onDragOver}
            onDragLeave={sortable?.onDragLeave}
            onDrop={sortable?.onDrop}
            onDragEnd={sortable?.onDragEnd}
        >
            <div className={classes.header}>
                {sortable ? (
                    <button
                        ref={sortable.handleRef}
                        type="button"
                        className={clsx(
                            'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-draggable',
                            classes.handle,
                        )}
                        title={`Déplacer ${name}`}
                        aria-keyshortcuts="ArrowUp ArrowDown"
                        aria-describedby={sortable.describedBy}
                        onPointerDown={sortable.onHandlePointerDown}
                        onKeyDown={sortable.onHandleKeyDown}
                    >
                        {`Déplacer ${name}`}
                    </button>
                ) : null}
                {pinned ? <span className={classes['handle-slot']} aria-hidden="true" /> : null}
                <span
                    className={clsx(classes.vignette, icon)}
                    style={
                        color
                            ? {
                                  backgroundColor: withAlpha(color, swatchOpacities.fill),
                                  borderColor: withAlpha(color, swatchOpacities.line),
                              }
                            : undefined
                    }
                    aria-hidden="true"
                />
                <span className={classes.title}>
                    <span className={classes.name}>{name}</span>
                </span>
                <VisibilityButton
                    displayed={displayed}
                    label={displayed ? `Masquer ${name}` : `Afficher ${name}`}
                    onClick={() => onToggleDisplayed(!displayed)}
                />
                {expandable ? (
                    <ExpandButton
                        name={name}
                        expanded={expanded}
                        controls={detailsId}
                        onClick={() => setExpanded((prev) => !prev)}
                    />
                ) : (
                    // keeps the eye in the same column as on the rows that unfold
                    <span className={classes['toggle-slot']} aria-hidden="true" />
                )}
            </div>

            {expandable ? (
                <Collapse id={detailsId} expanded={expanded}>
                    <div className={classes.details}>
                        {onOpacityChange !== undefined && opacity !== undefined ? (
                            <Range
                                small
                                valueAtEnd
                                labelHidden
                                label={`Opacité de ${name}`}
                                value={Math.round(opacity * 100)}
                                min={0}
                                max={100}
                                step={5}
                                formatValue={formatOpacity}
                                onChange={(value) => onOpacityChange(value / 100)}
                            />
                        ) : null}
                        {description ? <p className={classes.description}>{description}</p> : null}
                    </div>
                </Collapse>
            ) : null}
        </div>
    );
};

export default Component;
