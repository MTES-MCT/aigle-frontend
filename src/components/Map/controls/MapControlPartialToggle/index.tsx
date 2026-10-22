import React, { useEffect, useMemo, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { useMap } from '@/store/slices/map';
import { TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import clsx from 'clsx';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const [partialLayersDisplayed, setPartialLayersDisplayed] = useState(true);
    const { setTileSetsVisibility, getTileSets, eventEmitter, layers } = useMap();

    const partialLayersUuids = useMemo(
        () => getTileSets(['PARTIAL'], ['VISIBLE', 'HIDDEN']).map((tileSet) => tileSet.uuid),
        [],
    );

    useEffect(() => {
        const updatePartialLayersDisplayed = () => {
            const partialLayersDisplayed = (layers || []).filter(
                (layer) => layer.tileSet.tileSetType === 'PARTIAL' && layer.displayed,
            );
            setPartialLayersDisplayed(partialLayersDisplayed.length > 0);
        };

        eventEmitter.on('LAYERS_UPDATED', updatePartialLayersDisplayed);

        return () => {
            eventEmitter.off('LAYERS_UPDATED', updatePartialLayersDisplayed);
        };
    }, [layers]);

    return (
        <MapControlCustom
            contentClassName={classes.content}
            containerClassName={classes.container}
            controlType="SIMPLE"
            position="bottom-left"
            isShowed={true}
        >
            <button
                type="button"
                className={clsx(
                    'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left',
                    partialLayersDisplayed ? 'fr-icon-eye-line' : 'fr-icon-eye-off-line',
                )}
                aria-pressed={partialLayersDisplayed}
                onClick={() => setTileSetsVisibility(partialLayersUuids || [], !partialLayersDisplayed)}
            >
                Images {TILE_SET_TYPES_NAMES_MAP.PARTIAL}
            </button>
        </MapControlCustom>
    );
};

export default Component;
