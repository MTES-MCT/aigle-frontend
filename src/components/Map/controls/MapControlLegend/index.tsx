import React from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { CUSTOM_ZONE_NEGATIVE_COLOR, PARCEL_COLOR, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
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
                className={clsx(classes['legend-item-square'], classes['legend-item-bordered'])}
                style={{
                    borderColor: objectType.color,
                }}
            />
            {objectType.name}
        </li>
    );
};

interface CustomZoneLegendProps {
    name: string;
    color: string;
    withBorder?: boolean;
}

const CustomZoneLegend: React.FC<CustomZoneLegendProps> = ({ name, color, withBorder = true }) => {
    return (
        <li className={classes['legend-item']}>
            <div
                className={clsx(
                    classes['legend-item-square'],
                    withBorder ? classes['legend-item-bordered'] : null,
                    withBorder ? classes['legend-item-square-dashed'] : null,
                )}
                style={{
                    borderColor: `${color}66`,
                    backgroundColor: `${color}33`,
                }}
            />
            {name}
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
                                className={clsx(classes['legend-item-square'], classes['legend-item-bordered'])}
                                style={{
                                    borderColor: '#686868',
                                }}
                            />
                            Associé à une couche &quot;{TILE_SET_TYPES_NAMES_MAP.BACKGROUND}&quot;
                        </li>
                        <li className={classes['legend-item']}>
                            <div
                                className={clsx(classes['legend-item-round'], classes['legend-item-bordered'])}
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
                            <CustomZoneLegend
                                key={geoCustomZone.uuid}
                                name={geoCustomZone.name}
                                color={geoCustomZone.color}
                            />
                        ))}
                        <CustomZoneLegend
                            name="Zones exclues par les filtres"
                            withBorder={false}
                            color={CUSTOM_ZONE_NEGATIVE_COLOR}
                        />
                    </ul>
                </div>
                <div>
                    <h2>Indications</h2>

                    <ul className={classes['legends']}>
                        <li className={classes['legend-item']}>
                            <div
                                className={clsx(
                                    classes['legend-item-square'],
                                    classes['legend-item-bordered'],
                                    classes['legend-item-square-dashed'],
                                )}
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
