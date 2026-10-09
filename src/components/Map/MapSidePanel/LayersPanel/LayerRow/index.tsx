import Collapse from '@/components/dsfr/Collapse';
import Range from '@/components/dsfr/Range';
import { getCustomZoneOpacities, withAlpha } from '@/utils/colors';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY } from '@/utils/constants';
import clsx from 'clsx';
import React, { useId, useState } from 'react';
import classes from './index.module.scss';

const formatOpacity = (opacity: number) => `${Math.round(opacity)} %`;

export type DropPosition = 'before' | 'after';

export interface LayerRowSortableProps {
    dragged: boolean;
    dropPosition?: DropPosition;
    describedBy: string;
    handleRef: (handle: HTMLButtonElement | null) => void;
    onHandleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

interface ComponentProps {
    name: string;
    displayed: boolean;
    color?: string;
    icon?: string;
    description?: string | null;
    opacity?: number;
    sortable?: LayerRowSortableProps;
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
    // Only a drag started from the handle moves the row: the rest of it holds buttons and a slider.
    const [dragArmed, setDragArmed] = useState(false);
    const expandable = onOpacityChange !== undefined || !!description;
    const swatchOpacities = getCustomZoneOpacities(opacity ?? DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

    return (
        <div
            className={clsx(
                classes.layer,
                sortable?.dragged && classes['layer-dragged'],
                sortable?.dropPosition && classes[`layer-drop-${sortable.dropPosition}`],
            )}
            draggable={dragArmed}
            onDragStart={sortable?.onDragStart}
            onDragOver={sortable?.onDragOver}
            onDragLeave={sortable?.onDragLeave}
            onDrop={sortable?.onDrop}
            onDragEnd={() => {
                setDragArmed(false);
                sortable?.onDragEnd();
            }}
        >
            <div className={classes.header}>
                {sortable ? (
                    <button
                        ref={sortable.handleRef}
                        type="button"
                        className={clsx(
                            'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-drag-move-2-line',
                            classes.handle,
                        )}
                        title={`Déplacer ${name}`}
                        aria-keyshortcuts="ArrowUp ArrowDown"
                        aria-describedby={sortable.describedBy}
                        onPointerDown={(event) => {
                            if (event.button !== 0) {
                                return;
                            }

                            setDragArmed(true);
                            // pointercancel when the drag starts or the touch scrolls, no pointerup then
                            const disarm = () => {
                                setDragArmed(false);
                                document.removeEventListener('pointerup', disarm);
                                document.removeEventListener('pointercancel', disarm);
                            };
                            document.addEventListener('pointerup', disarm);
                            document.addEventListener('pointercancel', disarm);
                        }}
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
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                        displayed ? 'fr-icon-eye-line' : 'fr-icon-eye-off-line',
                    )}
                    title={displayed ? `Masquer ${name}` : `Afficher ${name}`}
                    onClick={() => onToggleDisplayed(!displayed)}
                >
                    {displayed ? `Masquer ${name}` : `Afficher ${name}`}
                </button>
                {expandable ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-down-s-line"
                        title={expanded ? `Replier ${name}` : `Déplier ${name}`}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        onClick={() => setExpanded((prev) => !prev)}
                    >
                        {expanded ? `Replier ${name}` : `Déplier ${name}`}
                    </button>
                ) : null}
            </div>

            {expandable ? (
                <Collapse id={detailsId} expanded={expanded}>
                    <div className={classes.details}>
                        {onOpacityChange !== undefined && opacity !== undefined ? (
                            <Range
                                small
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
