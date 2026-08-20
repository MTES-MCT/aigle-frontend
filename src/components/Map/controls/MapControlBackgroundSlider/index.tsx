import React, { useEffect, useId, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { useMap } from '@/store/slices/map';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { backgroundLayerYears, getBackgroundTileSetYearDisplayed, setBackgroundTileSetYearDisplayed, eventEmitter } =
        useMap();
    const groupId = `background-year-${useId()}`;
    const [yearDisplayed, setYearDisplayed] = useState<string>();

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
                                onChange={() => setBackgroundTileSetYearDisplayed(year)}
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
