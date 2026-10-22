import React, { useEffect, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { getBackgroundYearRank } from '@/components/Map/utils/tracking';
import { useMap } from '@/store/slices/map';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import clsx from 'clsx';
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
        const updateLayerDisplayed = () => {
            const year = getBackgroundTileSetYearDisplayed();

            if (year) {
                setYearDisplayed(year);
            }
        };

        updateLayerDisplayed();
        eventEmitter.on('LAYERS_UPDATED', updateLayerDisplayed);

        return () => {
            eventEmitter.off('LAYERS_UPDATED', updateLayerDisplayed);
        };
    }, [eventEmitter, getBackgroundTileSetYearDisplayed]);

    return (
        <MapControlCustom
            contentClassName={classes.content}
            controlClassName={classes.control}
            controlType="SIMPLE"
            position="bottom-left"
            inline
            isShowed={true}
        >
            <div className={classes.years} role="group" aria-label="Année du fond de carte">
                {(backgroundLayerYears || []).map((year) => (
                    <button
                        key={year}
                        type="button"
                        className={clsx('fr-btn fr-btn--tertiary-no-outline fr-btn--sm', classes.year)}
                        aria-pressed={yearDisplayed === year}
                        onClick={() => {
                            // here, never in the effect above, which also follows the add-object tool's reset
                            if (tracked && year !== getBackgroundTileSetYearDisplayed()) {
                                trackEvent(
                                    TRACKING_CATEGORIES.mapLayers,
                                    'Année du fond de carte changée',
                                    `${getBackgroundYearRank(year, backgroundLayerYears || [])} : Sélecteur`,
                                    Number(year),
                                );
                            }
                            setBackgroundTileSetYearDisplayed(year);
                        }}
                    >
                        {year}
                    </button>
                ))}
            </div>
        </MapControlCustom>
    );
};

export default Component;
