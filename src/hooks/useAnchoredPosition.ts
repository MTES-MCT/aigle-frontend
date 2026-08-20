import { RefObject, useCallback, useLayoutEffect, useState } from 'react';

export interface AnchorRect {
    top: number;
    left: number;
    // distance from the viewport's right edge, for a popup that aligns to the anchor's right
    right: number;
    width: number;
}

/** Follows an element's viewport rect while `active`, so a fixed-position popup can track it. */
export const useAnchoredPosition = (anchorRef: RefObject<HTMLElement>, active: boolean) => {
    const [position, setPosition] = useState<AnchorRect>();

    const update = useCallback(() => {
        const node = anchorRef.current;

        if (!node) {
            return;
        }

        const rect = node.getBoundingClientRect();
        setPosition({
            top: rect.bottom,
            left: rect.left,
            right: document.documentElement.clientWidth - rect.right,
            width: rect.width,
        });
    }, [anchorRef]);

    useLayoutEffect(() => {
        if (!active) {
            return;
        }

        update();

        // capture phase so the side panel's own scroll container is caught too
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);

        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [active, update]);

    return position;
};
