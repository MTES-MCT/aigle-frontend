import clsx from 'clsx';
import React, { PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from 'react';

const TRANSITION_MS = 300;

interface ComponentProps extends PropsWithChildren {
    id: string;
    expanded: boolean;
    className?: string;
}

/**
 * DSFR's collapse mechanism, driven from React instead of the DSFR JS runtime.
 *
 * `fr-collapse--expanded` opens the block, but the transition is a negative `margin-top` on
 * a `::before` pseudo-element whose distance comes from `--collapse`. Left at DSFR's
 * `-99999px` default the content flies in over that distance every time — so the height has
 * to be measured. It is measured on the inner wrapper, not on the collapse itself: a
 * collapsed block has `max-height: 0` and would always measure 0, while its child keeps its
 * natural height and simply overflows.
 *
 * `fr-collapsing` suspends that `max-height: 0` for the length of the transition, otherwise
 * closing snaps instead of sliding. It is skipped on the first render, where there is
 * nothing to animate from.
 */
const Component: React.FC<ComponentProps> = ({ id, expanded, className, children }: ComponentProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [collapsing, setCollapsing] = useState(false);
    const mountedRef = useRef(false);

    useLayoutEffect(() => {
        const node = contentRef.current;

        if (!node) {
            return;
        }

        const observer = new ResizeObserver(() => setContentHeight(node.offsetHeight));
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }

        setCollapsing(true);
        const timeout = setTimeout(() => setCollapsing(false), TRANSITION_MS);

        return () => clearTimeout(timeout);
    }, [expanded]);

    return (
        <div
            id={id}
            className={clsx(
                'fr-collapse',
                expanded && 'fr-collapse--expanded',
                collapsing && 'fr-collapsing',
                className,
            )}
            style={{ '--collapse': `-${contentHeight}px` } as React.CSSProperties}
        >
            <div ref={contentRef}>{children}</div>
        </div>
    );
};

export default Component;
