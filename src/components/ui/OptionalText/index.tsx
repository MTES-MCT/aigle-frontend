import React, { ReactNode } from 'react';

import classes from './index.module.scss';

interface ComponentProps {
    text?: ReactNode | null;
    emptyText?: string;
}
const Component: React.FC<ComponentProps> = ({ text, emptyText = 'non-spécifié' }: ComponentProps) => {
    if (text) {
        return text;
    }

    return <span className={classes['empty-text']}>{emptyText}</span>;
};

export default Component;
