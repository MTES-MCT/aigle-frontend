import React, { useEffect, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { getBackgroundYearRank } from '@/components/Map/utils/tracking';
import { useMap } from '@/store/slices/map';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { SegmentedControl } from '@mantine/core';
import classes from './index.module.scss';

interface ComponentProps {
    tracked?: boolean;
}

const Component: React.FC<ComponentProps> = ({ tracked = false }) => {
    const { backgroundLayerYears, getBackgroundTileSetYearDisplayed, setBackgroundTileSetYearDisplayed, eventEmitter } =
        useMap();

    // from the store: a later visit to /map must show the year still displayed, not the most recent one
    const [yearDisplayed, setYearDisplayed] = useState<string | undefined>(getBackgroundTileSetYearDisplayed);

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
                onChange={(year) => {
                    // here, never in the effects above, which also follow the add-object tool's reset
                    if (tracked && year !== getBackgroundTileSetYearDisplayed()) {
                        trackEvent(
                            TRACKING_CATEGORIES.mapLayers,
                            'Année du fond de carte changée',
                            `${getBackgroundYearRank(year, backgroundLayerYears || [])} : Sélecteur`,
                            Number(year),
                        );
                    }
                    setYearDisplayed(year);
                }}
                value={yearDisplayed}
            />
        </MapControlCustom>
    );
};

export default Component;
