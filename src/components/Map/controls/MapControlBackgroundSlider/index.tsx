import React, { useEffect, useMemo, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { TileSetStatus, TileSetType } from '@/models/tile-set';
import { useMap } from '@/utils/context/map-context';
import { SegmentedControl } from '@mantine/core';
import { format } from 'date-fns';
import classes from './index.module.scss';

const TILE_SET_TYPES: TileSetType[] = ['BACKGROUND'] as const;
const TILE_SET_STATUSES: TileSetStatus[] = ['VISIBLE', 'HIDDEN'] as const;

const Component: React.FC = () => {
    const { getTileSets, getTileSetsUuids, setTileSetVisibility, layers, eventEmitter } = useMap();

    const [value, setValue] = useState<string>();
    const backgroundTileSets = useMemo(() => getTileSets(TILE_SET_TYPES, TILE_SET_STATUSES), [layers]);
    useEffect(() => {
        if (!value) {
            return;
        }

        setTileSetVisibility(value, true);
    }, [value]);
    useEffect(() => {
        const updateLayerDisplayed = () => {
            const tileSetDisplayedUuid = getTileSetsUuids(TILE_SET_TYPES, TILE_SET_STATUSES, true);

            if (tileSetDisplayedUuid.length) {
                setValue(tileSetDisplayedUuid[0]);
            }
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
                data={backgroundTileSets.map((tileSet) => ({
                    label: format(tileSet.date, 'yyyy'),
                    value: tileSet.uuid,
                }))}
                onChange={setValue}
                value={value}
            />
        </MapControlCustom>
    );
};

export default Component;
