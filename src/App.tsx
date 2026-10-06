import { mapEndpoints, userGroupEndpoints, usersEndpoints } from '@/api/endpoints';
import { markDetectionObjectOpened } from '@/components/DetectionDetail/tracking';
import Loader from '@/components/ui/Loader';
import { collectivityTypes } from '@/models/geo/_common';
import { MapSettings } from '@/models/map-settings';
import { User } from '@/models/user';
import { UserGroupDetail } from '@/models/user-group';
import { allRoutes, RouteConfig } from '@/routes/config';
import NotFound from '@/routes/NotFound';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { useStatistics } from '@/store/slices/statistics';
import { extractObjectTypesFromSettings, getInitialMapGeoCustomZoneLayers } from '@/store/utils';
import api, { ApiError } from '@/utils/api';
import { setupBrevo } from '@/utils/brevo';
import { DEFAULT_ROUTE } from '@/utils/constants';
import {
    identifyMatomoUser,
    isMatomoUserIdentified,
    setTrackedReferrerUrl,
    setTrackedUrl,
    trackEvent,
    trackPageView,
} from '@/utils/matomo';
import {
    getObjectsFilterLink,
    ObjectsFilterLinkDimension,
    removeDetectionObjectUuidFromUrl,
} from '@/utils/objects-filter';
import ProtectedRoute from '@/utils/ProtectedRoute';
import { getStoredUserGroupUuid, isScopeDisabledPath, setScopedUserGroupUuid } from '@/utils/scope';
import { getFilterTrackingName, PAGE_TRACKING_TITLES, TRACKING_CATEGORIES } from '@/utils/tracking';
import * as Sentry from '@sentry/react';
import React, { useCallback, useEffect, useState } from 'react';
import { matchRoutes, Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _paq?: any[];
    }
}

/**
 * Make sure a SUPER_ADMIN has a user group to browse as. Returns false when the
 * page is reloading (a fresh scope was just persisted) — the caller must stop.
 */
const resolveSuperAdminScope = async (): Promise<boolean> => {
    if (getStoredUserGroupUuid()) {
        return true;
    }

    const userGroups = await api<UserGroupDetail[]>(userGroupEndpoints.list);

    if (!userGroups.length) {
        return true;
    }

    setScopedUserGroupUuid(userGroups[0].uuid);

    return false;
};

// Hide the Brevo support chat and Sentry report buttons in the admin section.
// Both hang off <body>, so a body class + CSS reaches them from outside React.
const SupportWidgetsVisibility: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        document.body.classList.toggle('hide-support-widgets', isScopeDisabledPath(pathname));
    }, [pathname]);

    return null;
};

// The only param reported: a tabbed page's tab, with a slug value (others hold uuids, filters, typed text).
// The default tab is filled in, as the page writes it into the url only once mounted: a tab keeps one url.
const PAGE_TABS: Record<string, { param: string; defaultTab: string }> = {
    '/help': { param: 'onglet', defaultTab: 'videos' },
    '/admin/custom-zones': { param: 'tab', defaultTab: 'custom-zones' },
    '/admin/collectivites': { param: 'tab', defaultTab: collectivityTypes[0] },
    '/admin/imports': { param: 'tab', defaultTab: 'runs' },
    '/admin/run-command': { param: 'tab', defaultTab: 'execute' },
};
const TRACKED_QUERY_VALUE = /^[a-z0-9_-]{1,40}$/i;
// The <Navigate> routes below: nobody sees them, their target gets the page view.
const REDIRECT_PATHS = ['/', '/admin'];
const NOT_FOUND_TRACKED_PATH = '/page-introuvable';

interface TrackedRoute {
    path: string;
    config?: RouteConfig;
}

const TRACKED_ROUTES: TrackedRoute[] = [
    ...REDIRECT_PATHS.map((path) => ({ path })),
    ...allRoutes.map((config) => ({ path: config.path, config })),
];

interface TrackedLocation {
    route?: TrackedRoute;
    // The tab as the url has it, empty before the page writes its default one.
    query: string;
    url: string;
}

// The route pattern ('/admin/users/form/:uuid') stands for the path: no uuid, token or email reaches Matomo.
const getTrackedLocation = (pathname: string, search: string, hash = ''): TrackedLocation => {
    const match = matchRoutes(TRACKED_ROUTES, pathname)?.[0]?.route;
    const route = match && match.path !== '*' ? match : undefined;
    const pageTab = route && PAGE_TABS[route.path];
    const tab = pageTab ? new URLSearchParams(search).get(pageTab.param) : null;
    const query = pageTab && tab && TRACKED_QUERY_VALUE.test(tab) ? `${pageTab.param}=${tab}` : '';
    // The help center picks the tab of an anchor ('/help#<question>') itself: no default is assumed then.
    const reportedQuery = pageTab && !query && !hash ? `${pageTab.param}=${pageTab.defaultTab}` : query;

    return {
        route,
        query,
        url: `${window.location.origin}${route?.path ?? NOT_FOUND_TRACKED_PATH}${reportedQuery ? `?${reportedQuery}` : ''}`,
    };
};

const getSameOriginReferrer = (): string | undefined => {
    try {
        const referrer = new URL(document.referrer);
        return referrer.origin === window.location.origin
            ? getTrackedLocation(referrer.pathname, referrer.search).url
            : undefined;
    } catch {
        return undefined;
    }
};

// Pages that render a <Navigate> for the current user.
const isRedirect = (path: string, config: RouteConfig | undefined, authenticated: boolean): boolean => {
    if (REDIRECT_PATHS.includes(path)) {
        return true;
    }
    if (!config) {
        return false;
    }
    if (config.requiresAuth === false) {
        return authenticated;
    }
    if (!authenticated) {
        return true;
    }

    const { userMe } = useAuth.getState();
    if (config.roles && userMe && !config.roles.includes(userMe.userRole)) {
        return true;
    }

    return !!config.isAccessible && !config.isAccessible();
};

// Module state, not a ref: the router unmounts behind the loader while a login bootstraps, and
// StrictMode runs effects twice.
let lastTrackedPage: { path: string; query: string; url: string; authenticated: boolean } | null = null;

/**
 * Sends a page view when the route pattern (or its tab) changes, never on a raw location change:
 * the filters rewrite the query string on every keystroke. Rendered before <Routes> so it runs
 * ahead of the page's own effects, whose events then carry this page's url.
 */
const MatomoUrlSync: React.FC = () => {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        const authenticated = useAuth.getState().isAuthenticated();
        const { route, query, url } = getTrackedLocation(pathname, search, hash);
        const previous = lastTrackedPage;

        if (!route) {
            // The not-found page reports itself with an event.
            setTrackedUrl(url);
            lastTrackedPage = { path: NOT_FOUND_TRACKED_PATH, query: '', url, authenticated };
            return;
        }

        if (isRedirect(route.path, route.config, authenticated)) {
            return;
        }

        if (authenticated && !isMatomoUserIdentified()) {
            setTrackedUrl(url);
            return;
        }

        lastTrackedPage = { path: route.path, query, url, authenticated };

        if (previous?.path === route.path && previous.authenticated === authenticated) {
            if (previous.query === query) {
                return;
            }

            // A page writing its tab into the url right after it mounts is the same page view.
            const previousParams = new URLSearchParams(previous.query);
            const params = new URLSearchParams(query);
            if (Array.from(previousParams).every(([key, value]) => params.get(key) === value)) {
                setTrackedUrl(url);
                return;
            }
        }

        // logout() reloads the page right after: its /login would be counted twice. An expired session
        // does not reload, and forgets the user.
        if (previous?.authenticated && !authenticated && isMatomoUserIdentified()) {
            setTrackedUrl(url);
            return;
        }

        trackPageView(url, PAGE_TRACKING_TITLES[route.path] ?? route.path, previous?.url ?? getSameOriginReferrer());
    }, [pathname, search]);

    return null;
};

// Pages whose url carries the objects filter.
const ENTRY_LINK_PAGES: Record<string, string> = {
    '/map': 'Carte',
    '/table': 'Tableau',
};

const FILTER_DIMENSION_TRACKING_NAMES: Record<ObjectsFilterLinkDimension, string> = {
    statuses: 'statuts',
    objectTypes: 'types d’objets',
    zones: 'zones',
};

// Bootstrap runs again on a login after a session expiry, and twice under StrictMode.
let entryLinkHandled = false;

const getSameOriginReferrerPath = (): string | null => {
    try {
        const referrer = new URL(document.referrer);
        return referrer.origin === window.location.origin ? referrer.pathname : null;
    } catch {
        return null;
    }
};

interface EntryNavigation {
    fresh: boolean;
    // The page of the app that opened this one.
    referrerPath: string | null;
}

// Holds the referrer path ('' for none) of a link whose expired session made logout() reload it.
const ENTRY_LINK_KEPT_STORAGE_KEY = 'aigle.entry-link-kept';
let entryNavigation: EntryNavigation | undefined;

/**
 * A link or a bookmark opens the page: a reload or a back/forward replays the app's own url. The
 * exception is the reload logout() does when the session had expired, whose referrer is the page
 * itself: the link survives the login, so the original navigation is kept for it.
 */
const getEntryNavigation = (): EntryNavigation => {
    if (!entryNavigation) {
        const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        let keptReferrerPath: string | null = null;
        try {
            keptReferrerPath = sessionStorage.getItem(ENTRY_LINK_KEPT_STORAGE_KEY);
            sessionStorage.removeItem(ENTRY_LINK_KEPT_STORAGE_KEY);
        } catch {
            // storage unavailable: such a link reads as a reload
        }

        entryNavigation =
            navigation?.type === 'reload' && keptReferrerPath !== null
                ? { fresh: true, referrerPath: keptReferrerPath || null }
                : { fresh: navigation?.type === 'navigate', referrerPath: getSameOriginReferrerPath() };
    }

    return entryNavigation;
};

// Called right before logout() reloads the page.
const keepEntryLinkAcrossLogout = () => {
    const { fresh, referrerPath } = getEntryNavigation();
    if (entryLinkHandled || !fresh || !ENTRY_LINK_PAGES[window.location.pathname]) {
        return;
    }

    try {
        sessionStorage.setItem(ENTRY_LINK_KEPT_STORAGE_KEY, referrerPath ?? '');
    } catch {
        // storage unavailable: the link is not counted
    }
};

/** How the page was entered: a detection link, a filtered view, a link whose filter could not be applied. */
const trackEntryLink = (pathname: string, search: string, mapSettings: MapSettings) => {
    if (entryLinkHandled) {
        return;
    }
    entryLinkHandled = true;

    const { fresh, referrerPath } = getEntryNavigation();
    const page = ENTRY_LINK_PAGES[pathname];
    if (!page || !fresh) {
        return;
    }

    const { initialDetectionObjectUuid } = useMap.getState();
    if (pathname === '/map' && initialDetectionObjectUuid) {
        // The table opens its detections in a new tab.
        trackEvent(
            TRACKING_CATEGORIES.detection,
            'Fiche ouverte',
            referrerPath === '/table' ? 'Lien du tableau' : 'Lien partagé',
        );
        markDetectionObjectOpened(initialDetectionObjectUuid);
    }

    // Opened from inside the app, like the help center exercises: neither shared nor bookmarked.
    if (referrerPath) {
        return;
    }

    const { allObjectTypes, visibleObjectTypesUuids } = extractObjectTypesFromSettings(mapSettings);
    const { objectsFilter, differsFromDefault, scopeChanged, unresolved } = getObjectsFilterLink(
        search,
        Array.from(visibleObjectTypesUuids),
        getInitialMapGeoCustomZoneLayers(mapSettings).flatMap(({ customZoneUuids }) => customZoneUuids),
        allObjectTypes.map(({ uuid }) => uuid),
    );

    // Every load writes the filter into the url, so a plain bookmark holds the default one.
    if (differsFromDefault) {
        trackEvent(
            TRACKING_CATEGORIES.navigation,
            'Vue filtrée ouverte par lien',
            `${page} : ${getFilterTrackingName(objectsFilter)}${scopeChanged ? ' + périmètre' : ''}`,
        );
    }

    if (unresolved.length) {
        trackEvent(
            TRACKING_CATEGORIES.navigation,
            'Filtre de lien ignoré',
            `${page} : ${unresolved
                .map((dimension) => FILTER_DIMENSION_TRACKING_NAMES[dimension])
                .sort()
                .join(' + ')}`,
        );
    }
};

const App: React.FC = () => {
    const { isAuthenticated, setUser, logout, userMe } = useAuth();
    const { setMapSettings } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();
    const [bootstrapped, setBootstrapped] = useState(false);
    const [bootstrapStarted, setBootstrapStarted] = useState(false);

    const isAuthenticated_ = isAuthenticated();

    /**
     * Nothing scoped may be requested before we know WHO we are and, for a
     * SUPER_ADMIN, WHICH group we browse as — an unscoped answer would fill the
     * stores with every object type and every tile set year. So the router stays
     * behind a loader until this resolves.
     */
    const bootstrap = useCallback(async () => {
        let user: User;

        setBootstrapStarted(true);

        // Events sent while bootstrapping must not carry the raw url (detection uuid, filters), nor
        // the raw same-origin referrer a detection link opened from the table comes with.
        setTrackedUrl(getTrackedLocation(window.location.pathname, window.location.search, window.location.hash).url);
        const referrerUrl = getSameOriginReferrer();
        if (!lastTrackedPage && referrerUrl) {
            setTrackedReferrerUrl(referrerUrl);
        }

        try {
            user = await api<User>(usersEndpoints.me);
        } catch (err) {
            // Only a rejected identity means "log out". A network blip — or a stale
            // group scope, which the API client recovers from by reloading — must not
            // throw the session away.
            if (err instanceof ApiError && [401, 403].includes(err.status)) {
                keepEntryLinkAcrossLogout();
                logout();
            } else {
                console.error(err);
                const persistedUser = useAuth.getState().userMe;
                if (persistedUser) {
                    identifyMatomoUser(persistedUser);
                }
                setBootstrapped(true);
            }

            return;
        }

        setUser(user);
        identifyMatomoUser(user);
        setupBrevo(user);

        // The admin section is deliberately unscoped, and never reads the map stores. A REGULAR
        // user is sent from there to the map, which needs them.
        if (isScopeDisabledPath(window.location.pathname) && user.userRole !== 'REGULAR') {
            setBootstrapped(true);
            return;
        }

        // Read before the map settings write the resolved filter into the url.
        const { pathname: entryPathname, search: entrySearch } = window.location;

        try {
            if (user.userRole === 'SUPER_ADMIN' && !(await resolveSuperAdminScope())) {
                return; // reloading with the new scope
            }

            const mapSettings = await api<MapSettings>(mapEndpoints.settings);
            setMapSettings(mapSettings);
            setStatisticsMapSettings(mapSettings);
            trackEntryLink(entryPathname, entrySearch, mapSettings);
            removeDetectionObjectUuidFromUrl();
        } catch (err) {
            console.error(err);
        }

        setBootstrapped(true);
    }, [setUser, logout, setMapSettings, setStatisticsMapSettings]);

    useEffect(() => {
        if (isAuthenticated_) {
            bootstrap();
        }
    }, [isAuthenticated_, bootstrap]);

    // A session expired without a reload: the next login bootstraps behind the loader again, so its
    // user is identified (and its settings loaded) before the first page view.
    useEffect(() => {
        if (!isAuthenticated_ && bootstrapped) {
            setBootstrapped(false);
            setBootstrapStarted(false);
        }
    }, [isAuthenticated_, bootstrapped]);

    // The Sentry report button is for the aigle team only — DDTM and collectivity
    // users report through their referent. getFeedback() is undefined when Sentry
    // is disabled (local dev), so this no-ops there.
    useEffect(() => {
        if (userMe?.userRole !== 'SUPER_ADMIN') {
            return;
        }

        // A super admin browses scoped to one group; which one changes what they
        // see, so a report is barely reproducible without it.
        Sentry.setTag('scopedUserGroup', getStoredUserGroupUuid());

        const widget = Sentry.getFeedback()?.createWidget();

        return () => widget?.removeFromDom();
    }, [userMe?.userRole]);

    // An expired session clears the tokens mid-bootstrap, right before logout() reloads: keep the
    // loader up rather than flash the login page, whose page view and effects would run twice.
    if (!bootstrapped && (isAuthenticated_ || bootstrapStarted)) {
        return <Loader fullScreen />;
    }

    return (
        <Router>
            <SupportWidgetsVisibility />
            <MatomoUrlSync />
            <Routes>
                <Route index element={<Navigate to="/map" replace />} />
                <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                {allRoutes.map((route) => {
                    const { path, component: Component, requiresAuth = true } = route;

                    if (requiresAuth === false) {
                        return (
                            <Route
                                key={path}
                                path={path}
                                element={isAuthenticated_ ? <Navigate to={DEFAULT_ROUTE} /> : <Component />}
                            />
                        );
                    }

                    return (
                        <Route
                            key={path}
                            path={path}
                            element={
                                <ProtectedRoute route={route}>
                                    <Component />
                                </ProtectedRoute>
                            }
                        />
                    );
                })}
                <Route
                    path="*"
                    element={
                        <ProtectedRoute>
                            <NotFound />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;
