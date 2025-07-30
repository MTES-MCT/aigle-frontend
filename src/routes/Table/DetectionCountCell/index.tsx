import React from 'react';

import { ParcelListItem } from '@/models/parcel';
import { Badge } from '@mantine/core';
import classes from './index.module.scss';

interface ComponentProps {
    parcel: ParcelListItem;
}
const Component: React.FC<ComponentProps> = ({ parcel }: ComponentProps) => {
    return (
        <div className={classes.detectionCountCell}>
            <div>{parcel.detectionsCount} détections :</div>
            <ul className={classes['detection-count-list']}>
                {parcel.detectionsCountByObjectType.map(
                    ({ objectTypeName, objectTypeUuid, objectTypeColor, count }) => (
                        <li key={objectTypeUuid} className={classes['detection-count-list-item']}>
                            <Badge radius={50} color={objectTypeColor} />
                            {objectTypeName} : {count}
                        </li>
                    ),
                )}
            </ul>
        </div>
    );
};

export default Component;
