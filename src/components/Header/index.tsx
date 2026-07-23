import React from 'react';

import marianneImg from '@/assets/marianne.svg';
import UserGroupSelector from '@/components/UserGroupSelector';
import { useAuth } from '@/store/slices/auth';
import { ENVIRONMENT } from '@/utils/constants';
import { isScopeBoundaryCrossed } from '@/utils/scope';
import { Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconAdjustments,
    IconHelp,
    IconInfoCircle,
    IconMap,
    IconReportAnalytics,
    IconTable,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

const getSearchParamsForPath = (path: string) => {
    if (path.startsWith('/admin')) {
        return '';
    }
    return window.location.search;
};

const NavMenu: React.FC = () => {
    const { userMe, logout, getCanViewStatistics } = useAuth();
    const navigate = useNavigate();

    const handleNavigate = (path: string) => (e: React.MouseEvent) => {
        // The admin section is unscoped, the rest of the app is scoped to the
        // selected user group. Crossing that boundary is a scope change, so let
        // the browser follow the href: a full load leaves no stale state behind.
        if (userMe?.userRole === 'SUPER_ADMIN' && isScopeBoundaryCrossed(window.location.pathname, path)) {
            return;
        }

        e.preventDefault();
        navigate(`${path}${getSearchParamsForPath(path)}`);
    };

    return (
        <>
            <ul className="fr-btns-group">
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <li className={classes['group-selector-li']}>
                        <UserGroupSelector />
                    </li>
                ) : null}
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/map" onClick={handleNavigate('/map')}>
                        <IconMap className={classes['link-icon']} size={16} />
                        Carte
                    </a>
                </li>
                {getCanViewStatistics() ? (
                    <li>
                        <a
                            className="fr-btn fr-btn--tertiary-no-outline"
                            href="/statistics"
                            onClick={handleNavigate('/statistics')}
                        >
                            <IconReportAnalytics className={classes['link-icon']} size={16} />
                            Stats
                        </a>
                    </li>
                ) : null}
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/table" onClick={handleNavigate('/table')}>
                        <IconTable className={classes['link-icon']} size={16} />
                        Tableau
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/about" onClick={handleNavigate('/about')}>
                        <IconInfoCircle className={classes['link-icon']} size={16} />A propos
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/help" onClick={handleNavigate('/help')}>
                        <IconHelp className={classes['link-icon']} size={16} />
                        Besoin d&apos;aide
                    </a>
                </li>
            </ul>

            <ul className="fr-btns-group">
                {userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
                    <li>
                        <a
                            className="fr-btn fr-btn--tertiary-no-outline"
                            href="/admin"
                            onClick={handleNavigate('/admin')}
                        >
                            <IconAdjustments className={classes['link-icon']} size={16} />
                            Admin
                        </a>
                    </li>
                ) : null}
                <li>
                    <a
                        className="fr-btn fr-icon-lock-line fr-btn--tertiary-no-outline"
                        href="/"
                        onClick={() => logout()}
                    >
                        Se déconnecter
                    </a>
                </li>
            </ul>
        </>
    );
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const { userMe } = useAuth();

    const [burgerOpened, { toggle: toggleBurgerOpened }] = useDisclosure();

    return (
        <header role="banner" className={clsx(classes.container, 'fr-header')}>
            <div className="fr-header__body">
                <div className="fr-container">
                    <div className="fr-header__body-row">
                        <div className="fr-header__brand">
                            <img
                                className="fr-header__brand-top fr-hidden-lg"
                                src={marianneImg}
                                alt="République française"
                            />
                            <div className="fr-header__brand-top fr-hidden fr-unhidden-lg">
                                <div className="fr-header__logo">
                                    <p className="fr-logo">
                                        Ministère de
                                        <br />
                                        la transition
                                        <br />
                                        écologique
                                    </p>
                                </div>
                            </div>
                            <div className="fr-header__service">
                                <a
                                    href="/"
                                    title="Accueil - Aigle - Ministère de la transition écologique"
                                    onClick={(e) => {
                                        // Leaving /admin flips the scope — reload instead.
                                        if (
                                            userMe?.userRole === 'SUPER_ADMIN' &&
                                            isScopeBoundaryCrossed(window.location.pathname, '/')
                                        ) {
                                            return;
                                        }

                                        e.preventDefault();
                                        navigate(`/${getSearchParamsForPath('/')}`);
                                    }}
                                >
                                    <p className="fr-header__service-title">
                                        Aigle <span className="fr-badge fr-badge--green-menthe">BETA</span>
                                        {ENVIRONMENT === 'preprod' ? (
                                            <span className="fr-badge fr-badge--warning">pré-prod</span>
                                        ) : null}
                                    </p>
                                </a>
                                <p className="fr-header__service-tagline fr-hidden fr-unhidden-xl">
                                    Détection par IA des irr.
                                    <br />
                                    d&apos;occupation du sol
                                </p>
                            </div>
                        </div>

                        <Burger
                            opened={burgerOpened}
                            onClick={toggleBurgerOpened}
                            hiddenFrom="md"
                            size="sm"
                            mr="md"
                            ml="md"
                        />

                        <div className="fr-header__tools">
                            <div className="fr-header__tools-links">
                                <NavMenu />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {burgerOpened ? (
                <div className={classes['mobile-menu']}>
                    <NavMenu />
                </div>
            ) : null}
        </header>
    );
};

export default Component;
