import clsx from 'clsx';
import React, { useEffect, useId, useRef, useState } from 'react';
import classes from './index.module.scss';

// DSFR's own JS hardcodes these px thumb sizes (1rem / 1.5rem at a 16px root); the track
// geometry has to use the same numbers or the fill and the thumb drift apart.
const THUMB_SIZE_PX = 24;
const THUMB_SIZE_SM_PX = 16;

interface ComponentProps {
    label: string;
    // kept for screen readers when the context already names the slider
    labelHidden?: boolean;
    value: number;
    min: number;
    max: number;
    step?: number;
    small?: boolean;
    // the track alone, the value written after it instead of the bubble and the min/max labels
    valueAtEnd?: boolean;
    formatValue?: (value: number) => string;
    onChange: (value: number) => void;
}

/**
 * DSFR range slider. Everything the DSFR JS runtime would compute is done here: the
 * `data-fr-js-range` attribute (without it the filled track and the value bubble are not
 * even rendered), the `--progress-right` clip boundary and the bubble's transform.
 */
const Component: React.FC<ComponentProps> = ({
    label,
    labelHidden = false,
    value,
    min,
    max,
    step,
    small = false,
    valueAtEnd = false,
    formatValue,
    onChange,
}: ComponentProps) => {
    const id = `range-${useId()}`;
    const rangeRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const node = rangeRef.current;

        if (!node) {
            return;
        }

        const observer = new ResizeObserver(() => setWidth(node.getBoundingClientRect().width));
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const thumbSize = small ? THUMB_SIZE_SM_PX : THUMB_SIZE_PX;
    const ratio = max === min ? 0 : (value - min) / (max - min);
    // width is 0 until the observer first fires; a negative clip boundary would flash the
    // filled track over the whole rail
    const trackWidth = Math.max(width - thumbSize, 0);
    const progressRight = `${(trackWidth * ratio + thumbSize * 0.5).toFixed(2)}px`;
    const outputTransform = `translateX(${ratio * width}px) translateX(-${ratio * 100}%)`;
    const format = formatValue || String;

    const input = (
        <input
            type="range"
            id={id}
            name={id}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            aria-labelledby={`${id}-label`}
        />
    );

    return (
        <div className={clsx('fr-range-group', valueAtEnd && classes['group-value-at-end'])}>
            <label className={clsx('fr-label', labelHidden && 'fr-sr-only')} id={`${id}-label`} htmlFor={id}>
                {label}
            </label>
            {valueAtEnd ? (
                <div className={classes['value-at-end']}>
                    <div
                        ref={rangeRef}
                        className={clsx('fr-range', small && 'fr-range--sm', classes.track)}
                        data-fr-js-range="true"
                        style={{ '--progress-right': progressRight } as React.CSSProperties}
                    >
                        {input}
                    </div>
                    <span className={classes['end-value']} aria-hidden="true">
                        {format(value)}
                    </span>
                </div>
            ) : (
                <div
                    ref={rangeRef}
                    className={clsx('fr-range', small && 'fr-range--sm')}
                    data-fr-js-range="true"
                    style={{ '--progress-right': progressRight } as React.CSSProperties}
                >
                    <span className="fr-range__output" style={{ transform: outputTransform }}>
                        {format(value)}
                    </span>
                    {input}
                    <span className="fr-range__min" aria-hidden="true">
                        {format(min)}
                    </span>
                    <span className="fr-range__max" aria-hidden="true">
                        {format(max)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Component;
