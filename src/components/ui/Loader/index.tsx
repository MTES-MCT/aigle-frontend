import React from 'react';

import { Loader } from '@mantine/core';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ComponentProps {
    className?: string;
    fullScreen?: boolean;
}

const Component: React.FC<ComponentProps> = ({ className, fullScreen }) => {
    return (
        <div className={clsx(classes.container, fullScreen && classes['full-screen'], className)}>
            <Loader />
        </div>
    );
};

export default Component;
