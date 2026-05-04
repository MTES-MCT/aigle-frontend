import React, { PropsWithChildren } from 'react';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import classes from './index.module.scss';

interface ComponentProps {
    title: string;
    actions?: React.ReactNode;
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ title, actions, children }) => {
    return (
        <LayoutAdmin title={title}>
            <div className={classes['top-section']}>
                <h1>{title}</h1>
                <div className={classes.actions}>{actions}</div>
            </div>
            {children}
        </LayoutAdmin>
    );
};

export default Component;
