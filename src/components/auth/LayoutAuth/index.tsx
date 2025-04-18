import { Image } from '@mantine/core';
import React, { PropsWithChildren } from 'react';

import logoImg from '@/assets/logo.png';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { getPageTitle } from '@/utils/html';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title?: string;
}

const Component: React.FC<ComponentProps> = ({ children, title }: ComponentProps) => {
    return (
        <div className={classes.container}>
            <title>{getPageTitle(title)}</title>
            <Link to={DEFAULT_ROUTE}>
                <Image mb="md" src={logoImg} className={classes.logo} alt="Logo Aigle" h="100%" fit="contain" />
            </Link>

            {children}
        </div>
    );
};

export default Component;
