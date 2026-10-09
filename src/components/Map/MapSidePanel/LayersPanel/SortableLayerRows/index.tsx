import React, { useEffect, useId, useRef, useState } from 'react';

import { DropPosition, LayerRowSortableProps } from '@/components/Map/MapSidePanel/LayersPanel/LayerRow';

interface DropTarget {
    key: string;
    position: DropPosition;
}

interface ComponentProps<T> {
    items: T[];
    getKey: (item: T) => string;
    getName: (item: T) => string;
    // moves the item to the place the target holds
    onMove: (item: T, target: T) => void;
    renderRow: (item: T, sortable: LayerRowSortableProps) => React.ReactNode;
}

// The rows of one section, reordered by dragging their handle or with the arrow keys on it.
const Component = <T,>({ items, getKey, getName, onMove, renderRow }: ComponentProps<T>) => {
    const keys = items.map(getKey);
    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [announcement, setAnnouncement] = useState('');
    // the drag events of a gesture outrun the renders
    const draggedKeyRef = useRef<string | null>(null);
    const dropTargetRef = useRef<DropTarget | null>(null);
    const handlesRef = useRef(new Map<string, HTMLButtonElement>());
    const keyToFocusRef = useRef<string | null>(null);
    const hintId = useId();

    // a row moved with the keyboard is rendered at its new place, its handle has to keep the focus
    useEffect(() => {
        if (keyToFocusRef.current) {
            handlesRef.current.get(keyToFocusRef.current)?.focus();
            keyToFocusRef.current = null;
        }
    });

    const move = (from: number, to: number) => {
        onMove(items[from], items[to]);
        setAnnouncement(`${getName(items[from])} : position ${to + 1} sur ${items.length}`);
    };

    const updateDropTarget = (target: DropTarget | null) => {
        dropTargetRef.current = target;
        setDropTarget(target);
    };

    const endDrag = () => {
        draggedKeyRef.current = null;
        setDraggedKey(null);
        updateDropTarget(null);
    };

    // -1 when the drag comes from another section or from outside the panel
    const getDraggedIndex = () => (draggedKeyRef.current === null ? -1 : keys.indexOf(draggedKeyRef.current));

    // null when the row would land where it already is
    const getDropIndex = (from: number, { key, position }: DropTarget) => {
        const index = keys.indexOf(key) + (position === 'after' ? 1 : 0);
        const to = index > from ? index - 1 : index;

        return to === from ? null : to;
    };

    const getSortableProps = (key: string): LayerRowSortableProps => ({
        dragged: draggedKey === key,
        dropPosition: dropTarget?.key === key ? dropTarget.position : undefined,
        describedBy: hintId,
        handleRef: (handle) => {
            if (handle) {
                handlesRef.current.set(key, handle);
            } else {
                handlesRef.current.delete(key);
            }
        },
        onHandleKeyDown: (event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
                return;
            }

            event.preventDefault();
            const from = keys.indexOf(key);
            const to = from + (event.key === 'ArrowUp' ? -1 : 1);

            if (to < 0 || to >= keys.length) {
                return;
            }

            keyToFocusRef.current = key;
            move(from, to);
        },
        onDragStart: (event) => {
            // a text selection dragged from inside the row: a row drag targets the row itself
            if (event.target !== event.currentTarget) {
                return;
            }

            event.dataTransfer.effectAllowed = 'move';
            // Firefox starts no drag without data
            event.dataTransfer.setData('text/plain', key);
            draggedKeyRef.current = key;
            // once the browser has taken the row's picture for the drag image
            setTimeout(() => setDraggedKey(draggedKeyRef.current));
        },
        onDragOver: (event) => {
            const from = getDraggedIndex();

            if (from === -1) {
                return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';

            const { top, height } = event.currentTarget.getBoundingClientRect();
            const target: DropTarget = { key, position: event.clientY < top + height / 2 ? 'before' : 'after' };
            const nextTarget = getDropIndex(from, target) === null ? null : target;

            if (
                nextTarget?.key !== dropTargetRef.current?.key ||
                nextTarget?.position !== dropTargetRef.current?.position
            ) {
                updateDropTarget(nextTarget);
            }
        },
        onDragLeave: (event) => {
            // from the row to one of its own children
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                return;
            }

            if (dropTargetRef.current?.key === key) {
                updateDropTarget(null);
            }
        },
        onDrop: (event) => {
            const from = getDraggedIndex();

            if (from === -1) {
                return;
            }

            event.preventDefault();
            const to = dropTargetRef.current ? getDropIndex(from, dropTargetRef.current) : null;

            if (to !== null) {
                move(from, to);
            }

            endDrag();
        },
        onDragEnd: endDrag,
    });

    return (
        <>
            {items.map((item, index) => (
                <React.Fragment key={keys[index]}>{renderRow(item, getSortableProps(keys[index]))}</React.Fragment>
            ))}
            <p id={hintId} className="fr-sr-only">
                Flèches haut et bas pour déplacer la couche
            </p>
            <p className="fr-sr-only" aria-live="polite">
                {announcement}
            </p>
        </>
    );
};

export default Component;
