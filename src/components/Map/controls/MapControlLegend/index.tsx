import React, { useMemo } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType, ObjectTypeMinimal } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import { CUSTOM_ZONE_NEGATIVE_COLOR, OTHER_OBJECT_TYPE, PARCEL_COLOR } from '@/utils/constants';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ObjectTypeLegendProps {
    objectType: ObjectTypeMinimal;
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
    otherObjectTypesUuids: Set<string>;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ objectTypes, otherObjectTypesUuids, customZoneLayers }) => {
    const isOtherObjectTypes = useMemo(
        () => otherObjectTypesUuids && otherObjectTypesUuids.size > 0,
        [otherObjectTypesUuids],
    );
    const objectTypesDisplayed = useMemo(() => {
        if (otherObjectTypesUuids.size === 0) {
            return objectTypes;
        }

        return objectTypes.filter((ot) => !otherObjectTypesUuids.has(ot.uuid));
    }, [objectTypes, otherObjectTypesUuids]);

    return (
        <div className={classes['legends-container']}>
            <div>
                <h2>Types d&apos;objets</h2>

                <ul className={classes['legends']}>
                    {objectTypesDisplayed.map((type) => (
                        <ObjectTypeLegend key={type.uuid} objectType={type} />
                    ))}

                    {isOtherObjectTypes ? <ObjectTypeLegend objectType={OTHER_OBJECT_TYPE} /> : null}
                </ul>
            </div>
            <div className={classes['legends-column']}>
                <div>
                    <h2>Zones à enjeux</h2>

                    <ul className={classes['legends']}>
                        {customZoneLayers.map(({ name, color, customZoneUuids }) => (
                            <CustomZoneLegend key={customZoneUuids.join(',')} name={name} color={color} />
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
    const { objectTypes, customZoneLayers, otherObjectTypesUuids } = useMap();

    if (!objectTypes || !customZoneLayers || !otherObjectTypesUuids) {
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
            <ComponentInner
                objectTypes={objectTypes}
                otherObjectTypesUuids={otherObjectTypesUuids}
                customZoneLayers={customZoneLayers}
            />
        </MapControlCustom>
    );
};

export default Component;
