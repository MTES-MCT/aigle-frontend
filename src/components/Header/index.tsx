import React, { useEffect, useId, useRef, useState } from 'react';

import aigleLogoImg from '@/assets/logo.png';
import marianneImg from '@/assets/marianne.svg';
import Collapse from '@/components/dsfr/Collapse';
import UserGroupSelector from '@/components/UserGroupSelector';
import { useAuth } from '@/store/slices/auth';
import { ENVIRONMENT } from '@/utils/constants';
import { isScopeBoundaryCrossed } from '@/utils/scope';
import { Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

const getSearchParamsForPath = (path: string) => {
    if (path.startsWith('/admin')) {
        return '';
    }

    return window.location.search;
};

/**
 * The admin section is unscoped, the rest of the app is scoped to the selected user
 * group. Crossing that boundary is a scope change, so the browser follows the href: a
 * full load leaves no stale state behind.
 */
const useNavigateKeepingScope = () => {
    const { userMe } = useAuth();
    const navigate = useNavigate();

    return (path: string) => (e: React.MouseEvent) => {
        if (userMe?.userRole === 'SUPER_ADMIN' && isScopeBoundaryCrossed(window.location.pathname, path)) {
            return;
        }

        e.preventDefault();
        navigate(`${path}${getSearchParamsForPath(path)}`);
    };
};

const MainNav: React.FC = () => {
    const { getCanViewStatistics } = useAuth();
    const { pathname } = useLocation();
    const handleNavigate = useNavigateKeepingScope();

    const items = [
        { path: '/map', label: 'Carte' },
        { path: '/table', label: 'Tableau' },
        ...(getCanViewStatistics() ? [{ path: '/statistics', label: 'Statistiques' }] : []),
    ];

    return (
        <nav className="fr-nav" role="navigation" aria-label="Menu principal">
            <ul className="fr-nav__list">
                {items.map(({ path, label }) => (
                    <li className="fr-nav__item" key={path}>
                        <a
                            className="fr-nav__link"
                            href={path}
                            onClick={handleNavigate(path)}
                            aria-current={pathname.startsWith(path) ? 'page' : undefined}
                        >
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const UserMenu: React.FC = () => {
    const { userMe, logout } = useAuth();
    // QuickAccessLinks is rendered twice (header row + burger menu), so the id has to be
    // per-instance or aria-controls resolves to the other, hidden panel.
    const panelId = `user-menu-${useId()}`;
    const [opened, setOpened] = useState(false);
    const containerRef = useRef<HTMLLIElement>(null);
    const handleNavigate = useNavigateKeepingScope();
    const isAdmin = !!userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole);

    useEffect(() => {
        if (!opened) {
            return;
        }

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpened(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpened(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [opened]);

    if (!userMe) {
        return null;
    }

    return (
        <li className={classes['user-menu']} ref={containerRef}>
            <button
                type="button"
                className="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-down-s-line fr-btn--icon-right"
                aria-expanded={opened}
                aria-controls={panelId}
                onClick={() => setOpened((prev) => !prev)}
            >
                <span className={classes['user-menu-email']}>{userMe.email}</span>
            </button>
            <Collapse id={panelId} expanded={opened} className={clsx('fr-menu', classes['user-menu-panel'])}>
                <ul className={clsx('fr-menu__list', classes['user-menu-list'])}>
                    {isAdmin ? (
                        <li>
                            <a className="fr-nav__link" href="/admin" onClick={handleNavigate('/admin')}>
                                Administration
                            </a>
                        </li>
                    ) : null}
                    <li>
                        <button type="button" className="fr-nav__link" onClick={() => logout()}>
                            Se déconnecter
                        </button>
                    </li>
                </ul>
            </Collapse>
        </li>
    );
};

const QuickAccessLinks: React.FC = () => {
    const { userMe } = useAuth();
    const handleNavigate = useNavigateKeepingScope();

    return (
        <ul className={clsx('fr-btns-group', 'fr-btns-group--inline', classes['tools-links'])}>
            {userMe?.userRole === 'SUPER_ADMIN' ? (
                <li>
                    <UserGroupSelector />
                </li>
            ) : null}
            <li>
                <a
                    className="fr-btn fr-btn--tertiary-no-outline fr-icon-information-line fr-btn--icon-left"
                    href="/about"
                    onClick={handleNavigate('/about')}
                >
                    A propos
                </a>
            </li>
            <li>
                <a
                    className="fr-btn fr-btn--tertiary-no-outline fr-icon-question-line fr-btn--icon-left"
                    href="/help"
                    onClick={handleNavigate('/help')}
                >
                    Besoin d&apos;aide
                </a>
            </li>
            <UserMenu />
        </ul>
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
                            <div className="fr-header__brand-top">
                                <div className="fr-header__logo">
                                    <img
                                        className={classes['marianne-logo']}
                                        src={marianneImg}
                                        alt="République française"
                                    />
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
                                    <p className={clsx('fr-header__service-title', classes['service-title'])}>
                                        <img className={classes['aigle-logo']} src={aigleLogoImg} alt="Aigle" />
                                        <span className="fr-badge fr-badge--sm fr-badge--green-menthe">BETA</span>
                                        {ENVIRONMENT === 'preprod' ? (
                                            <span className="fr-badge fr-badge--sm fr-badge--warning">pré-prod</span>
                                        ) : null}
                                    </p>
                                </a>
                            </div>
                        </div>

                        <Burger
                            opened={burgerOpened}
                            onClick={toggleBurgerOpened}
                            hiddenFrom="lg"
                            size="sm"
                            mr="md"
                            ml="md"
                        />

                        <div className="fr-header__tools">
                            <div className="fr-header__tools-links">
                                <QuickAccessLinks />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* fr-modal is what hides this row below 992px; DSFR reveals it on desktop with no JS */}
            <div className="fr-header__menu fr-modal" id="header-menu">
                <div className="fr-container">
                    <MainNav />
                </div>
            </div>

            {burgerOpened ? (
                <div className={classes['mobile-menu']}>
                    <MainNav />
                    <QuickAccessLinks />
                </div>
            ) : null}
        </header>
    );
};

export default Component;
