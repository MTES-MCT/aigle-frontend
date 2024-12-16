import { ActionIcon, Switch, Tooltip } from '@mantine/core';
import clsx from 'clsx';
import React, { PropsWithChildren, useMemo, useRef } from 'react';
import { ControlPosition, useControl } from 'react-map-gl';
import classes from './index.module.scss';

type ControlType = 'ACTION_BUTTON' | 'SWITCH' | 'SIMPLE';

interface ComponentProps extends PropsWithChildren {
    position?: ControlPosition;
    controlType?: ControlType;
    controlInner?: React.ReactNode;
    contentClassName?: string;
    containerClassName?: string;
    isShowed: boolean;
    label?: string;
    setIsShowed?: (state: boolean) => void;
    disabled?: boolean;
}

const Component: React.FC<ComponentProps> = ({
    position = 'top-left',
    controlType = 'ACTION_BUTTON',
    controlInner,
    containerClassName,
    contentClassName,
    isShowed,
    label,
    setIsShowed,
    disabled,
    children,
}) => {
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
            containerRef.current.style.pointerEvents = 'auto'; // Ensure the container allows pointer events
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

    const tooltipPosition = useMemo(() => {
        if (['top-right', 'top-left'].includes(position)) {
            return 'bottom';
        }

        return 'top';
    }, [position]);

    return (
        <>
            {controlType !== 'SIMPLE' ? (
                <div className={containerClassName} ref={controlContainerRef}>
                    {controlType === 'ACTION_BUTTON' ? (
                        <Tooltip label={label} position={tooltipPosition} offset={16}>
                            <ActionIcon
                                className={classes.button}
                                size={36}
                                variant="white"
                                onClick={() => setIsShowed && setIsShowed(!isShowed)}
                                disabled={!!disabled}
                                aria-label={label}
                                aria-hidden="true"
                            >
                                {controlInner}
                            </ActionIcon>
                        </Tooltip>
                    ) : null}
                    {controlType === 'SWITCH' ? (
                        <Tooltip label={label}>
                            <Switch
                                label={controlInner}
                                checked={isShowed}
                                onChange={(event) => setIsShowed && setIsShowed(event.currentTarget.checked)}
                                disabled={!!disabled}
                                aria-label={label}
                                aria-hidden="true"
                            />
                        </Tooltip>
                    ) : null}
                </div>
            ) : null}

            <div
                className={clsx(classes.content, contentClassName, {
                    [classes.showed]: isShowed || controlType === 'SIMPLE',
                })}
            >
                {children}
            </div>
        </>
    );
};

export default Component;
