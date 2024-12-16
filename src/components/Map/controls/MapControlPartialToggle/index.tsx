import React, { useEffect, useMemo, useState } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { Button } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
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
            <Button
                onClick={() => setTileSetsVisibility(partialLayersUuids || [], !partialLayersDisplayed)}
                leftSection={partialLayersDisplayed ? <IconEye /> : <IconEyeOff />}
                variant="transparent"
                size="sm"
                className={classes.button}
            >
                Images {TILE_SET_TYPES_NAMES_MAP.PARTIAL}
            </Button>
        </MapControlCustom>
    );
};

export default Component;
