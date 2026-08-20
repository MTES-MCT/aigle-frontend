import clsx from 'clsx';
import React, { PropsWithChildren, useId, useRef } from 'react';
import { ControlPosition, useControl } from 'react-map-gl';
import classes from './index.module.scss';

type ControlType = 'TOGGLE' | 'SIMPLE';

interface ComponentProps extends PropsWithChildren {
    position?: ControlPosition;
    controlType?: ControlType;
    controlInner?: React.ReactNode;
    contentClassName?: string;
    containerClassName?: string;
    isShowed: boolean;
    setIsShowed?: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({
    position = 'top-left',
    controlType = 'SIMPLE',
    controlInner,
    containerClassName,
    contentClassName,
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

            if (controlContainerRef.current) {
                containerRef.current.appendChild(controlContainerRef.current);
            }
            containerRef.current.classList.add('mapboxgl-ctrl');
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

    return (
        <>
            {controlType === 'TOGGLE' ? (
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
            ) : null}

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
        </>
    );
};

export default Component;
