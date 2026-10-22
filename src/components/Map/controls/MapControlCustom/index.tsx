import clsx from 'clsx';
import React, { PropsWithChildren, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ControlPosition, useControl } from 'react-map-gl';
import classes from './index.module.scss';

type ControlType = 'TOGGLE' | 'SIMPLE';

interface ComponentProps extends PropsWithChildren {
    position?: ControlPosition;
    controlType?: ControlType;
    controlInner?: React.ReactNode;
    contentClassName?: string;
    containerClassName?: string;
    // rendered inside the mapbox corner, in line with the other controls there, rather than over the map
    inline?: boolean;
    // on the mapbox control element itself, e.g. to order it within its corner
    controlClassName?: string;
    isShowed: boolean;
    setIsShowed?: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({
    position = 'top-left',
    controlType = 'SIMPLE',
    controlInner,
    containerClassName,
    contentClassName,
    inline = false,
    controlClassName,
    isShowed,
    setIsShowed,
    children,
}: ComponentProps) => {
    const toggleId = `map-control-${useId()}`;
    const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
    const controlContainerRef = useRef<HTMLDivElement>(null);

    class CustomMapControl implements mapboxgl.IControl {
        public map?: mapboxgl.Map;

        onAdd(map: mapboxgl.Map): HTMLElement {
            this.map = map;

            if (!inline && controlContainerRef.current) {
                containerRef.current.appendChild(controlContainerRef.current);
            }
            containerRef.current.classList.add('mapboxgl-ctrl');
            if (controlClassName) {
                containerRef.current.classList.add(controlClassName);
            }
            containerRef.current.style.pointerEvents = 'auto';
            return containerRef.current;
        }

        onRemove(): void {
            if (containerRef.current.parentNode) {
                containerRef.current.parentNode.removeChild(containerRef.current);
            }
            this.map = undefined;
        }
    }

    useControl(() => new CustomMapControl(), { position });

    const toggle =
        controlType === 'TOGGLE' ? (
            <div className={containerClassName} ref={controlContainerRef}>
                <div className="fr-toggle fr-toggle--label-left">
                    <input
                        type="checkbox"
                        className="fr-toggle__input"
                        id={toggleId}
                        checked={isShowed}
                        onChange={(event) => setIsShowed && setIsShowed(event.currentTarget.checked)}
                    />
                    <label className="fr-toggle__label" htmlFor={toggleId}>
                        {controlInner}
                    </label>
                </div>
            </div>
        ) : null;

    const content = (
        <div
            className={clsx(classes.content, inline && classes['content-inline'], contentClassName, {
                [classes.showed]: isShowed || controlType === 'SIMPLE',
            })}
        >
            {setIsShowed ? (
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line',
                        classes['close-button'],
                    )}
                    title="Fermer la section"
                    onClick={() => setIsShowed(false)}
                >
                    Fermer la section
                </button>
            ) : null}
            {children}
        </div>
    );

    if (inline) {
        // the content opens above its toggle
        return createPortal(
            <div className={classes.inline}>
                {content}
                {toggle}
            </div>,
            containerRef.current,
        );
    }

    return (
        <>
            {toggle}
            {content}
        </>
    );
};

export default Component;
