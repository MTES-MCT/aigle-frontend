import LayoutBase from '@/components/LayoutBase';
import Statistics from '@/components/Statistics';
import React from 'react';
import classes from './index.module.scss';

const Component: React.FC = () => {
    return (
        <LayoutBase>
            <div className={classes['charts-container']}>
                <Statistics />
            </div>
        </LayoutBase>
    );
};

export default Component;
