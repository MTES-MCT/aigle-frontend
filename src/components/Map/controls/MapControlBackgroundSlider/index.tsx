import React, { useEffect, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { useMap } from '@/store/slices/map';
import { SegmentedControl } from '@mantine/core';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { backgroundLayerYears, getBackgroundTileSetYearDisplayed, setBackgroundTileSetYearDisplayed, eventEmitter } =
        useMap();

    const [yearDisplayed, setYearDisplayed] = useState<string>();

    useEffect(() => {
        if (!yearDisplayed) {
            return;
        }

        setBackgroundTileSetYearDisplayed(yearDisplayed);
    }, [yearDisplayed]);
    useEffect(() => {
        const updateLayerDisplayed = () => {
            const yearDisplayed = getBackgroundTileSetYearDisplayed();

            if (!yearDisplayed) {
                return;
            }

            setYearDisplayed(yearDisplayed);
        };

        eventEmitter.on('LAYERS_UPDATED', updateLayerDisplayed);

        return () => {
            eventEmitter.off('LAYERS_UPDATED', updateLayerDisplayed);
        };
    });

    return (
        <MapControlCustom
            contentClassName={classes.content}
            controlType="SIMPLE"
            position="bottom-left"
            isShowed={true}
        >
            <SegmentedControl
                className={classes['controller']}
                fullWidth
                color="#117f58"
                orientation="vertical"
                data={backgroundLayerYears || []}
                onChange={setYearDisplayed}
                value={yearDisplayed}
            />
        </MapControlCustom>
    );
};

export default Component;
