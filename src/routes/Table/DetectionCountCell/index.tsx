import React from 'react';

import { ParcelListItem } from '@/models/parcel';
import ObjectTypeSquare from '@/routes/Table/ObjectTypeSquare';
import classes from './index.module.scss';

interface ComponentProps {
    parcel: ParcelListItem;
}
const Component: React.FC<ComponentProps> = ({ parcel }: ComponentProps) => {
    return (
        <div>
            <p className="fr-cell__title">
                {parcel.detectionsCount} {parcel.detectionsCount > 1 ? 'détections' : 'détection'}
            </p>
            <ul className={classes['detection-count-list']}>
                {parcel.detectionsCountByObjectType.map(
                    ({ objectTypeName, objectTypeUuid, objectTypeColor, count }) => (
                        <li key={objectTypeUuid} className={classes['detection-count-list-item']}>
                            <ObjectTypeSquare color={objectTypeColor} />
                            {objectTypeName} : {count}
                        </li>
                    ),
                )}
            </ul>
        </div>
    );
};

export default Component;
