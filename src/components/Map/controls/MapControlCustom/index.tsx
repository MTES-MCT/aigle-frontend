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
    // on the mapbox control element itself, e.g. to order it within its corner
    controlClassName?: string;
    isShowed: boolean;
    setIsShowed?: (state: boolean) => void;
}

// A mapbox control whose content React portals into the map corner, in line with the other controls there.
const Component: React.FC<ComponentProps> = ({
    position = 'top-left',
    controlType = 'SIMPLE',
    controlInner,
    containerClassName,
    contentClassName,
    controlClassName,
    isShowed,
    setIsShowed,
    children,
}: ComponentProps) => {
    const toggleId = `map-control-${useId()}`;
    const containerRef = useRef<HTMLDivElement>(document.createElement('div'));

    class CustomMapControl implements mapboxgl.IControl {
        onAdd(): HTMLElement {
            containerRef.current.classList.add('mapboxgl-ctrl');
            if (controlClassName) {
                containerRef.current.classList.add(controlClassName);
            }
            containerRef.current.style.pointerEvents = 'auto';
            return containerRef.current;
        }

        onRemove(): void {
            containerRef.current.parentNode?.removeChild(containerRef.current);
        }
    }

    useControl(() => new CustomMapControl(), { position });

    // the content opens above its toggle
    return createPortal(
        <div className={classes.inline}>
            <div
                className={clsx(classes.content, contentClassName, {
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
            {controlType === 'TOGGLE' ? (
                <div className={containerClassName}>
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
            ) : null}
        </div>,
        containerRef.current,
    );
};

export default Component;
