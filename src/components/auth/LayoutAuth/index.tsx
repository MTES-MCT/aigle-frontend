import { Image } from '@mantine/core';
import React, { PropsWithChildren } from 'react';

import logoImg from '@/assets/logo.png';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

const Component: React.FC<PropsWithChildren> = ({ children }) => {
    return (
        <div className={classes.container}>
            <Link to={DEFAULT_ROUTE}>
                <Image mb="md" src={logoImg} className={classes.logo} alt="Logo Aigle" h="100%" fit="contain" />
            </Link>

            {children}
        </div>
    );
};

export default Component;
