import React from 'react';

import { getObjectTypeSquareColor } from '@/utils/colors';
import classes from './index.module.scss';

// The outlined square the map draws detections with, as in the filters panel.
const Component: React.FC<{ color: string }> = ({ color }) => (
    <span className={classes.square} style={{ borderColor: getObjectTypeSquareColor(color) }} aria-hidden="true" />
);

export default Component;
