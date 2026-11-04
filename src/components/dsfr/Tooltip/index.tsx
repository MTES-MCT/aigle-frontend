import clsx from 'clsx';
import React, {
    cloneElement,
    ReactElement,
    ReactNode,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom';

interface Position {
    top: number;
    left: number;
    arrowX: number;
    placement: Placement;
}

// kept clear of the viewport edges, like the DSFR script does
const VIEWPORT_MARGIN = 8;
// lets the pointer cross from the trigger onto the bubble, which stays open while hovered (WCAG 1.4.13)
const UNHOVER_DELAY_MS = 100;

interface ComponentProps {
    label: ReactNode;
    // a single focusable element: it receives the hover and focus handlers and `aria-describedby`
    children: ReactElement<React.HTMLAttributes<HTMLElement>>;
}

/**
 * The DSFR tooltip (`fr-tooltip fr-placement`) without the DSFR script: shown while its trigger is
 * hovered or focused, hidden on Escape, portalled to the body with fixed coordinates so no scrolling
 * ancestor clips it. It flips below its trigger when there is no room above.
 */
const Component: React.FC<ComponentProps> = ({ label, children }: ComponentProps) => {
    const id = `tooltip-${useId()}`;
    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const unhoverTimerRef = useRef<number>();
    // two flags, as in the DSFR script: leaving with the pointer must not hide it from a focused trigger
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [position, setPosition] = useState<Position>();
    const shown = hovered || focused;

    const hover = () => {
        window.clearTimeout(unhoverTimerRef.current);
        setHovered(true);
    };
    const unhover = () => {
        unhoverTimerRef.current = window.setTimeout(() => setHovered(false), UNHOVER_DELAY_MS);
    };

    useEffect(() => () => window.clearTimeout(unhoverTimerRef.current), []);

    const place = useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;

        if (!trigger || !tooltip) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const { width, height } = tooltip.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const maxLeft = document.documentElement.clientWidth - width - VIEWPORT_MARGIN;
        const left = Math.max(VIEWPORT_MARGIN, Math.min(center - width / 2, maxLeft));
        const placement: Placement = rect.top - height >= VIEWPORT_MARGIN ? 'top' : 'bottom';

        setPosition({
            top: placement === 'top' ? rect.top - height : rect.bottom,
            left,
            arrowX: center - (left + width / 2),
            placement,
        });
    }, []);

    useLayoutEffect(() => {
        if (shown) {
            place();
        } else {
            setPosition(undefined);
        }
    }, [shown, label, place]);

    useEffect(() => {
        if (!shown) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.clearTimeout(unhoverTimerRef.current);
                setHovered(false);
                setFocused(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [shown, place]);

    const { onMouseEnter, onMouseLeave, onFocus, onBlur } = children.props;

    const trigger = cloneElement(children, {
        ref: triggerRef,
        'aria-describedby': clsx(children.props['aria-describedby'], id),
        onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
            onMouseEnter?.(event);
            hover();
        },
        onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
            onMouseLeave?.(event);
            unhover();
        },
        onFocus: (event: React.FocusEvent<HTMLElement>) => {
            onFocus?.(event);
            setFocused(true);
        },
        onBlur: (event: React.FocusEvent<HTMLElement>) => {
            onBlur?.(event);
            setFocused(false);
        },
    } as React.HTMLAttributes<HTMLElement>);

    return (
        <>
            {trigger}
            {createPortal(
                <span
                    ref={tooltipRef}
                    id={id}
                    role="tooltip"
                    className={clsx(
                        'fr-tooltip fr-placement',
                        `fr-placement--${position?.placement ?? 'top'}`,
                        shown && 'fr-tooltip--shown',
                    )}
                    onMouseEnter={hover}
                    onMouseLeave={unhover}
                    style={
                        {
                            position: 'fixed',
                            top: position?.top ?? 0,
                            left: position?.left ?? 0,
                            visibility: position ? undefined : 'hidden',
                            '--arrow-x': `${position?.arrowX ?? 0}px`,
                        } as React.CSSProperties
                    }
                >
                    {label}
                </span>,
                document.body,
            )}
        </>
    );
};

export default Component;
