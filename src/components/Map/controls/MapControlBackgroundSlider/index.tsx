import React, { useEffect, useId, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { getBackgroundYearRank } from '@/components/Map/utils/tracking';
import { useMap } from '@/store/slices/map';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import classes from './index.module.scss';

interface ComponentProps {
    tracked?: boolean;
}

const Component: React.FC<ComponentProps> = ({ tracked = false }) => {
    const { backgroundLayerYears, getBackgroundTileSetYearDisplayed, setBackgroundTileSetYearDisplayed, eventEmitter } =
        useMap();
    const groupId = `background-year-${useId()}`;
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
            controlType="SIMPLE"
            position="bottom-left"
            isShowed={true}
        >
            <fieldset className="fr-segmented fr-segmented--sm fr-segmented--vertical fr-segmented--no-legend">
                <legend className="fr-segmented__legend">Année du fond de carte</legend>
                <div className="fr-segmented__elements">
                    {(backgroundLayerYears || []).map((year) => (
                        <div className="fr-segmented__element" key={year}>
                            <input
                                type="radio"
                                id={`${groupId}-${year}`}
                                name={groupId}
                                value={year}
                                checked={yearDisplayed === year}
                                onChange={() => {
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
                            />
                            <label className="fr-label" htmlFor={`${groupId}-${year}`}>
                                {year}
                            </label>
                        </div>
                    ))}
                </div>
            </fieldset>
        </MapControlCustom>
    );
};

export default Component;
