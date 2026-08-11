import { UnstyledButton } from '@mantine/core';
import React from 'react';
import { ChartSeriesItem, mantineCssColor } from './activity';
import classes from './index.module.scss';

/**
 * Mantine's own legend only hover-highlights, so the charts get this one instead, through
 * `legendProps.content` which replaces Mantine's. Clicking a category takes it out of the
 * stack. It renders inside the chart wrapper, so the PNG export still finds it — see
 * readLegendItems in utils/download.
 */
const ChartLegendToggle: React.FC<{
    series: ChartSeriesItem[];
    hiddenSeries: Set<string>;
    onToggle: (name: string) => void;
}> = ({ series, hiddenSeries, onToggle }) => (
    <div className={classes['chart-legend']}>
        {series.map((item) => (
            <UnstyledButton
                key={item.name}
                className={classes['chart-legend-item']}
                data-chart-legend-item=""
                data-hidden={hiddenSeries.has(item.name) || undefined}
                aria-pressed={!hiddenSeries.has(item.name)}
                onClick={() => onToggle(item.name)}
            >
                <span
                    className={classes['chart-legend-swatch']}
                    style={{ '--series-color': mantineCssColor(item.color) } as React.CSSProperties}
                />
                {item.label}
            </UnstyledButton>
        ))}
    </div>
);

export default ChartLegendToggle;
