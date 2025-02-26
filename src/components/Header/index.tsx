import React, { useMemo } from 'react';

import logoSmallImg from '@/assets/logo_small.png';
import marianneImg from '@/assets/marianne.svg';
import { useAuth } from '@/utils/auth-context';
import { DEFAULT_ROUTE, ENVIRONMENT, ROLES_NAMES_MAP } from '@/utils/constants';
import { getColorFromString, getEmailInitials } from '@/utils/string';
import { Avatar, Burger, Button, Image, Menu, Tabs } from '@mantine/core';
import { useClickOutside, useDisclosure } from '@mantine/hooks';
import {
    IconAdjustments,
    IconHelp,
    IconInfoCircle,
    IconLogout,
    IconMap,
    IconReportAnalytics,
    IconTable,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

type TabValue = 'map' | 'admin' | 'statistics' | 'about' | 'help';

const getTabeValue = (pathname: string): TabValue => {
    if (pathname.includes('/map')) {
        return 'map';
    }

    if (pathname.includes('/statistics')) {
        return 'statistics';
    }

    if (pathname.includes('/about')) {
        return 'about';
    }

    if (pathname.includes('/help')) {
        return 'help';
    }

    return 'admin';
};

interface AvatarState {
    initials?: string;
    color?: string;
}

const NavMenu: React.FC = () => {
    const { userMe, logout } = useAuth();

    return (
        <>
            <ul className="fr-btns-group">
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/map">
                        <IconMap className={classes['link-icon']} size={16} />
                        Carte
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/statistics">
                        <IconReportAnalytics className={classes['link-icon']} size={16} />
                        Stats
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/table">
                        <IconTable className={classes['link-icon']} size={16} />
                        Tableau
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/about">
                        <IconInfoCircle className={classes['link-icon']} size={16} />A propos
                    </a>
                </li>
                <li>
                    <a className="fr-btn fr-btn--tertiary-no-outline" href="/help">
                        <IconHelp className={classes['link-icon']} size={16} />
                        Besoin d&apos;aide
                    </a>
                </li>
            </ul>

            <ul className="fr-btns-group">
                {userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
                    <li>
                        <a className="fr-btn fr-btn--tertiary-no-outline" href="/admin">
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
    const { userMe, logout } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [burgerOpened, { toggle: toggleBurgerOpened }] = useDisclosure();
    const mobileMenuRef = useClickOutside(toggleBurgerOpened);

    const avatarState: AvatarState = useMemo(
        () =>
            userMe?.email
                ? {
                      initials: getEmailInitials(userMe.email),
                      color: getColorFromString(userMe.email),
                  }
                : {},
        [userMe?.email],
    );

    const onTabChange = (tab: TabValue) => {
        if (tab === 'map') {
            navigate('/map');
        } else if (tab === 'statistics') {
            navigate('/statistics');
        } else if (tab === 'about') {
            navigate('/about');
        } else if (tab === 'help') {
            navigate('/help');
        } else {
            navigate('/admin');
        }
    };

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
                                <a href="/" title="Accueil - Aigle - Ministère de la transition écologique">
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
                <div className={classes['mobile-menu']} ref={mobileMenuRef}>
                    <NavMenu />
                </div>
            ) : null}
        </header>
    );

    return (
        <header className={classes.container}>
            <div className="navigation-items">
                <Link to={DEFAULT_ROUTE} className={classes['logo-container']}>
                    <Image src={logoSmallImg} alt="Logo Aigle" h="100%" fit="contain" />
                </Link>

                <Tabs
                    className={classes.tabs}
                    ml="xl"
                    value={getTabeValue(pathname)}
                    onChange={(value) => onTabChange(value as TabValue)}
                >
                    <Tabs.List className={classes['tabs-list']}>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconMap size={16} />}
                            value="map"
                        >
                            Carte
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconReportAnalytics size={16} />}
                            value="statistics"
                        >
                            Stats
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconInfoCircle size={16} />}
                            value="about"
                        >
                            A propos
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconHelp size={16} />}
                            value="help"
                        >
                            Besoin d&apos;aide
                        </Tabs.Tab>
                        {userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
                            <Tabs.Tab
                                pl="xl"
                                pr="xl"
                                className={classes.tab}
                                leftSection={<IconAdjustments size={16} />}
                                value="admin"
                            >
                                Admin
                            </Tabs.Tab>
                        ) : null}
                    </Tabs.List>
                </Tabs>
            </div>

            {userMe ? (
                <Menu position="bottom-end">
                    <Menu.Target>
                        <div className={classes['user-infos']}>
                            <div className={classes['user-infos-details']}>
                                <p className={classes['user-infos-details-email']}>{userMe.email}</p>
                                <p className={classes['user-infos-details-role']}>{ROLES_NAMES_MAP[userMe.userRole]}</p>
                            </div>
                            <Avatar className={classes['avatar-button']} color={avatarState.color}>
                                {avatarState.initials}
                            </Avatar>
                        </div>
                    </Menu.Target>

                    <Menu.Dropdown className={classes.menu}>
                        <div className={classes['user-infos']}>
                            <div className={classes['user-infos-details']}>
                                <p className={classes['user-infos-details-email']}>{userMe.email}</p>
                                <p className={classes['user-infos-details-role']}>{ROLES_NAMES_MAP[userMe.userRole]}</p>
                            </div>
                        </div>
                        <Button variant="outline" leftSection={<IconLogout />} onClick={() => logout()}>
                            Déconnexion
                        </Button>
                    </Menu.Dropdown>
                </Menu>
            ) : null}
        </header>
    );
};

export default Component;
