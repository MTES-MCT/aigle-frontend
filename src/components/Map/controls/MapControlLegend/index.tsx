import React from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { PARCEL_COLOR, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ObjectTypeLegendProps {
    objectType: ObjectType;
}

const ObjectTypeLegend: React.FC<ObjectTypeLegendProps> = ({ objectType }) => {
    return (
        <li className={classes['legend-item']}>
            <div
                className={classes['legend-item-square']}
                style={{
                    borderColor: objectType.color,
                }}
            />
            {objectType.name}
        </li>
    );
};

interface CustomZoneLegendProps {
    geoCustomZone: GeoCustomZone;
}

const CustomZoneLegend: React.FC<CustomZoneLegendProps> = ({ geoCustomZone }) => {
    return (
        <li className={classes['legend-item']}>
            <div
                className={clsx(classes['legend-item-square'], classes['legend-item-square-dashed'])}
                style={{
                    borderColor: `${geoCustomZone.color}66`,
                    backgroundColor: `${geoCustomZone.color}33`,
                }}
            />
            {geoCustomZone.name}
        </li>
    );
};

interface ComponentInnerProps {
    objectTypes: ObjectType[];
    customZoneLayers: MapGeoCustomZoneLayer[];
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ objectTypes, customZoneLayers }) => {
    return (
        <div className={classes['legends-container']}>
            <div>
                <h2>Types d&apos;objets</h2>

                <ul className={classes['legends']}>
                    {objectTypes.map((type) => (
                        <ObjectTypeLegend key={type.uuid} objectType={type} />
                    ))}
                </ul>
            </div>
            <div className={classes['legends-column']}>
                <div>
                    <h2>Couche de l&apos;objet</h2>

                    <ul className={classes['legends']}>
                        <li className={classes['legend-item']}>
                            <div
                                className={clsx(classes['legend-item-square'])}
                                style={{
                                    borderColor: '#686868',
                                }}
                            />
                            Associé à une couche &quot;{TILE_SET_TYPES_NAMES_MAP.BACKGROUND}&quot;
                        </li>
                        <li className={classes['legend-item']}>
                            <div
                                className={clsx(classes['legend-item-round'])}
                                style={{
                                    borderColor: '#686868',
                                }}
                            />
                            Associé à une couche &quot;{TILE_SET_TYPES_NAMES_MAP.PARTIAL}&quot;
                        </li>
                    </ul>
                </div>

                <div>
                    <h2>Zones à enjeux</h2>

                    <ul className={classes['legends']}>
                        {customZoneLayers.map(({ geoCustomZone }) => (
                            <CustomZoneLegend key={geoCustomZone.uuid} geoCustomZone={geoCustomZone} />
                        ))}
                    </ul>
                </div>
                <div>
                    <h2>Indications</h2>

                    <ul className={classes['legends']}>
                        <li className={classes['legend-item']}>
                            <div
                                className={clsx(classes['legend-item-square'], classes['legend-item-square-dashed'])}
                                style={{
                                    borderColor: PARCEL_COLOR,
                                }}
                            />
                            Parcelle
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

interface ComponentProps {
    isShowed: boolean;
    setIsShowed: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ isShowed, setIsShowed }) => {
    const { objectTypes, customZoneLayers } = useMap();

    if (!objectTypes || !customZoneLayers) {
        return null;
    }

    return (
        <MapControlCustom
            controlInner="Afficher la légende"
            controlType="SWITCH"
            position="bottom-left"
            contentClassName={classes.content}
            containerClassName={classes.container}
            isShowed={isShowed}
            setIsShowed={setIsShowed}
        >
            <ComponentInner objectTypes={objectTypes} customZoneLayers={customZoneLayers} />
        </MapControlCustom>
    );
};

export default Component;
