import React from 'react';

import { ParcelListItemDetectionCountByObjectType } from '@/models/parcel';
import ObjectTypeSquare from '@/routes/Table/ObjectTypeSquare';
import classes from './index.module.scss';

interface ComponentProps {
    count: number;
    countsByObjectType: ParcelListItemDetectionCountByObjectType[];
    // singular and plural
    unit?: [string, string];
}

const Component: React.FC<ComponentProps> = ({
    count,
    countsByObjectType,
    unit = ['détection', 'détections'],
}: ComponentProps) => {
    return (
        <div>
            <p className="fr-cell__title">
                {count} {count > 1 ? unit[1] : unit[0]}
            </p>
            <ul className={classes['detection-count-list']}>
                {countsByObjectType.map(({ objectTypeName, objectTypeUuid, objectTypeColor, count }) => (
                    <li key={objectTypeUuid} className={classes['detection-count-list-item']}>
                        <ObjectTypeSquare color={objectTypeColor} />
                        {objectTypeName} : {count}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Component;
