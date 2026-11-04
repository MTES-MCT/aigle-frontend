import React, { useEffect, useId, useRef, useState } from 'react';

import aigleLogoImg from '@/assets/logo.png';
import marianneImg from '@/assets/marianne.svg';
import Collapse from '@/components/dsfr/Collapse';
import UserGroupSelector from '@/components/UserGroupSelector';
import { UserRole } from '@/models/user';
import { trackContact } from '@/routes/HelpCenter/tracking';
import { CONTACT_EMAIL } from '@/routes/HelpCenter/utils';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { isBrevoChatEnabled, openBrevoChat } from '@/utils/brevo';
import { ENVIRONMENT } from '@/utils/constants';
import { isEscapeKeptByFocusedField, lockPageScroll, MAIN_CONTENT_ID } from '@/utils/html';
import { trackEvent } from '@/utils/matomo';
import { isScopeBoundaryCrossed } from '@/utils/scope';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
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
 * group. Crossing that boundary is a scope change for a SUPER_ADMIN, so the browser
 * follows the href: a full load leaves no stale state behind. It is also needed by
 * anyone whose session started in the admin section, which leaves the map stores empty.
 */
const isFullLoadNeeded = (userRole: UserRole | undefined, path: string) =>
    isScopeBoundaryCrossed(window.location.pathname, path) &&
    (userRole === 'SUPER_ADMIN' || !useMap.getState().settings);

const useNavigateKeepingScope = () => {
    const { userMe } = useAuth();
    const navigate = useNavigate();

    return (path: string) => (e: React.MouseEvent) => {
        if (isFullLoadNeeded(userMe?.userRole, path)) {
            return;
        }

        e.preventDefault();
        navigate(`${path}${getSearchParamsForPath(path)}`);
    };
};

const MainNav: React.FC = () => {
    const { pathname } = useLocation();
    const handleNavigate = useNavigateKeepingScope();

    const items = [
        { path: '/map', label: 'Carte' },
        { path: '/table', label: 'Tableau' },
        { path: '/statistics', label: 'Statistiques' },
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
    // QuickAccessLinks is rendered twice (header row + menu modal), so the id has to be
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
                        <button
                            type="button"
                            className="fr-nav__link"
                            onClick={() => {
                                trackEvent(TRACKING_CATEGORIES.account, 'Session fermée', 'Déconnexion');
                                // like the former `href="/"` link: the next login does not land on this session's page
                                logout('/');
                            }}
                        >
                            Se déconnecter
                        </button>
                    </li>
                </ul>
            </Collapse>
        </li>
    );
};

interface QuickAccessLinksProps {
    // the header row on desktop; the menu modal stacks them as DSFR does
    inline?: boolean;
    // opening the chat from the menu modal closes it, or the chat would sit behind its focus trap
    onChatOpen?: () => void;
}

const CONTACT_BUTTON_CLASSES = 'fr-btn fr-btn--tertiary-no-outline fr-icon-question-answer-line fr-btn--icon-left';

const QuickAccessLinks: React.FC<QuickAccessLinksProps> = ({ inline = false, onChatOpen }) => {
    const { userMe } = useAuth();
    const handleNavigate = useNavigateKeepingScope();

    return (
        <ul className={clsx('fr-btns-group', inline && 'fr-btns-group--inline')}>
            {userMe?.userRole === 'SUPER_ADMIN' ? (
                <li>
                    <UserGroupSelector />
                </li>
            ) : null}
            <li>
                {isBrevoChatEnabled ? (
                    <button
                        type="button"
                        className={CONTACT_BUTTON_CLASSES}
                        onClick={() => {
                            trackContact(TRACKING_CATEGORIES.support, 'Tchat');
                            onChatOpen?.();
                            openBrevoChat(CONTACT_EMAIL);
                        }}
                    >
                        Nous contacter
                    </button>
                ) : (
                    <a
                        className={CONTACT_BUTTON_CLASSES}
                        href={`mailto:${CONTACT_EMAIL}`}
                        onClick={() => trackContact(TRACKING_CATEGORIES.support, 'Courriel')}
                    >
                        Nous contacter
                    </a>
                )}
            </li>
            <li>
                <a
                    className="fr-btn fr-btn--tertiary-no-outline fr-icon-question-line fr-btn--icon-left"
                    href="/help"
                    onClick={handleNavigate('/help')}
                >
                    Aide
                </a>
            </li>
            <UserMenu />
        </ul>
    );
};

// The header navigation, also the target of the « Menu » skip link: the nav row on desktop, the menu
// modal below the DSFR lg breakpoint.
const MENU_ID = 'header-navigation';
const MENU_BUTTON_ID = 'header-menu-button';
const DESKTOP_MEDIA_QUERY = '(min-width: 62em)';
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The DSFR header menu modal without the DSFR JS. It also closes on a navigation and at the desktop
// breakpoint, where the same element is the nav row.
const useMenuModal = () => {
    const { key: locationKey } = useLocation();
    const [opened, setOpened] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => setOpened(false), [locationKey]);

    useEffect(() => {
        const menu = menuRef.current;

        if (!opened || !menu) {
            return;
        }

        const unlockPageScroll = lockPageScroll();
        const desktop = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const getFocusables = () =>
            Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (element) => element.getClientRects().length > 0,
            );

        getFocusables()[0]?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            // a dialog opened from the menu (the group selector) keeps its own keys
            if (!menu.contains(document.activeElement) && document.activeElement?.closest('[role="dialog"]')) {
                return;
            }

            if (event.key === 'Escape' && !isEscapeKeptByFocusedField()) {
                setOpened(false);
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const focusables = getFocusables();
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (!first) {
                return;
            }

            if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        const closeOnDesktop = () => {
            if (desktop.matches) {
                setOpened(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        desktop.addEventListener('change', closeOnDesktop);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            desktop.removeEventListener('change', closeOnDesktop);
            unlockPageScroll();

            if (menu.contains(document.activeElement)) {
                buttonRef.current?.focus();
            }
        };
    }, [opened]);

    return { opened, setOpened, menuRef, buttonRef };
};

const Component: React.FC = () => {
    const handleNavigate = useNavigateKeepingScope();
    const menu = useMenuModal();

    return (
        <>
            {/* DSFR skip links, first thing on the page */}
            <div className="fr-skiplinks">
                <nav className="fr-container" role="navigation" aria-label="Accès rapide">
                    <ul className="fr-skiplinks__list">
                        <li>
                            <a className="fr-link" href={`#${MAIN_CONTENT_ID}`}>
                                Contenu
                            </a>
                        </li>
                        <li>
                            <a className="fr-link" href={`#${MENU_ID}`}>
                                Menu
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            <header role="banner" className="fr-header">
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
                                    <div className="fr-header__navbar">
                                        <button
                                            ref={menu.buttonRef}
                                            id={MENU_BUTTON_ID}
                                            type="button"
                                            className="fr-btn--menu fr-btn"
                                            title="Menu"
                                            aria-controls={MENU_ID}
                                            aria-haspopup="dialog"
                                            data-fr-opened={menu.opened}
                                            onClick={() => menu.setOpened(true)}
                                        >
                                            Menu
                                        </button>
                                    </div>
                                </div>
                                <div className="fr-header__service">
                                    <a
                                        href="/"
                                        title="Accueil - Aigle - Ministère de la transition écologique"
                                        onClick={handleNavigate('/')}
                                    >
                                        <p className={clsx('fr-header__service-title', classes['service-title'])}>
                                            <img className={classes['aigle-logo']} src={aigleLogoImg} alt="Aigle" />
                                            <span className="fr-badge fr-badge--sm fr-badge--green-menthe">BETA</span>
                                            {ENVIRONMENT === 'preprod' ? (
                                                <span className="fr-badge fr-badge--sm fr-badge--warning">
                                                    pré-prod
                                                </span>
                                            ) : null}
                                        </p>
                                    </a>
                                </div>
                            </div>

                            <div className="fr-header__tools">
                                <div className="fr-header__tools-links">
                                    <QuickAccessLinks inline />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    ref={menu.menuRef}
                    id={MENU_ID}
                    className={clsx('fr-header__menu fr-modal', menu.opened && 'fr-modal--opened')}
                    aria-labelledby={MENU_BUTTON_ID}
                    role={menu.opened ? 'dialog' : undefined}
                    aria-modal={menu.opened ? true : undefined}
                >
                    <div className="fr-container">
                        <button
                            type="button"
                            className="fr-btn--close fr-btn"
                            title="Fermer"
                            aria-controls={MENU_ID}
                            onClick={() => menu.setOpened(false)}
                        >
                            Fermer
                        </button>
                        {/* DSFR copies the quick accesses here with its JS; a React app renders them twice */}
                        <div className="fr-header__menu-links">
                            <QuickAccessLinks onChatOpen={() => menu.setOpened(false)} />
                        </div>
                        <MainNav />
                    </div>
                </div>
            </header>
        </>
    );
};

export default Component;
