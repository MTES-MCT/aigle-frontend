import React, { ReactNode, useId } from 'react';

import { SortableRowProps } from '@/components/SortableRows';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ComponentProps {
    name: string;
    label: ReactNode;
    hint?: string;
    // 1-based, shown only on a checked row: the unchecked ones are out of the ranking
    position?: number;
    // without them the row is a plain ranked label
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    sortable: SortableRowProps;
}

// A row of a ranked list, a checkbox or a label, moved by its handle (drag, or arrow keys on it).
const Component: React.FC<ComponentProps> = ({
    name,
    label,
    hint,
    position,
    checked = true,
    onCheckedChange,
    sortable,
}: ComponentProps) => {
    const id = `sortable-checkbox-${useId()}`;

    return (
        <div
            className={clsx(
                classes.row,
                sortable.dragged && classes['row-dragged'],
                sortable.dropPosition && classes[`row-drop-${sortable.dropPosition}`],
            )}
            draggable={sortable.draggable}
            onDragStart={sortable.onDragStart}
            onDragOver={sortable.onDragOver}
            onDragLeave={sortable.onDragLeave}
            onDrop={sortable.onDrop}
            onDragEnd={sortable.onDragEnd}
        >
            <button
                ref={sortable.handleRef}
                type="button"
                className={clsx('fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-draggable', classes.handle)}
                title={`Déplacer ${name}`}
                aria-keyshortcuts="ArrowUp ArrowDown"
                aria-describedby={sortable.describedBy}
                onPointerDown={sortable.onHandlePointerDown}
                onKeyDown={sortable.onHandleKeyDown}
            >
                {`Déplacer ${name}`}
            </button>
            <span className={classes.position} aria-hidden="true">
                {checked && position ? position : ''}
            </span>
            {onCheckedChange ? (
                <div className={clsx('fr-checkbox-group', classes.checkbox)}>
                    <input
                        type="checkbox"
                        id={id}
                        name={id}
                        checked={checked}
                        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
                    />
                    <label className="fr-label" htmlFor={id}>
                        {label}
                        {hint ? <span className="fr-hint-text">{hint}</span> : null}
                    </label>
                </div>
            ) : (
                <div className={classes.label}>
                    {label}
                    {hint ? <span className="fr-hint-text">{hint}</span> : null}
                </div>
            )}
        </div>
    );
};

export default Component;
