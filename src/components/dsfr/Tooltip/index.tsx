import clsx from 'clsx';
import React, {
    cloneElement,
    isValidElement,
    ReactElement,
    ReactNode,
    Ref,
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

const assignRef = <T,>(ref: Ref<T> | undefined, value: T) => {
    if (typeof ref === 'function') {
        ref(value);
    } else if (ref) {
        (ref as React.MutableRefObject<T>).current = value;
    }
};

interface ComponentProps {
    label: ReactNode;
    // a single focusable element: it receives the hover and focus handlers and `aria-describedby`
    children: ReactElement;
    placement?: Placement;
}

/**
 * The DSFR tooltip (`fr-tooltip fr-placement`) without the DSFR script: shown on hover and focus,
 * hidden on Escape, portalled to the body with fixed coordinates so no scrolling ancestor clips
 * it. It flips below its trigger when there is no room above.
 */
const Component: React.FC<ComponentProps> = ({ label, children, placement = 'top' }: ComponentProps) => {
    const id = `tooltip-${useId()}`;
    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const [shown, setShown] = useState(false);
    const [position, setPosition] = useState<Position>();

    const show = () => setShown(true);
    const hide = () => {
        setShown(false);
        setPosition(undefined);
    };

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
        const fitsAbove = rect.top - height >= VIEWPORT_MARGIN;
        const actualPlacement: Placement = placement === 'top' && !fitsAbove ? 'bottom' : placement;

        setPosition({
            top: actualPlacement === 'top' ? rect.top - height : rect.bottom,
            left,
            arrowX: center - (left + width / 2),
            placement: actualPlacement,
        });
    }, [placement]);

    useLayoutEffect(() => {
        if (shown) {
            place();
        }
    }, [shown, label, place]);

    useEffect(() => {
        if (!shown) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hide();
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

    if (!isValidElement(children)) {
        return children;
    }

    const child = children as ReactElement<React.HTMLAttributes<HTMLElement>> & { ref?: Ref<HTMLElement> };
    const { onMouseEnter, onMouseLeave, onFocus, onBlur } = child.props;

    const trigger = cloneElement(child, {
        ref: (node: HTMLElement | null) => {
            triggerRef.current = node;
            assignRef(child.ref, node);
        },
        'aria-describedby': clsx(child.props['aria-describedby'], id),
        onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
            onMouseEnter?.(event);
            show();
        },
        onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
            onMouseLeave?.(event);
            hide();
        },
        onFocus: (event: React.FocusEvent<HTMLElement>) => {
            onFocus?.(event);
            show();
        },
        onBlur: (event: React.FocusEvent<HTMLElement>) => {
            onBlur?.(event);
            hide();
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
                        `fr-placement--${position?.placement ?? placement}`,
                        shown && 'fr-tooltip--shown',
                    )}
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
