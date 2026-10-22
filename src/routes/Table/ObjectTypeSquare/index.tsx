import React from 'react';

import classes from './index.module.scss';

// white (« Autres ») would vanish on the page: drawn in light grey, as in the map filters
const getSquareColor = (color: string) => (color.toUpperCase() === '#FFFFFF' ? '#E3E3E3' : color);

// The outlined square the map draws detections with, as in the filters panel.
const Component: React.FC<{ color: string }> = ({ color }) => (
    <span className={classes.square} style={{ borderColor: getSquareColor(color) }} aria-hidden="true" />
);

export default Component;
