import { User, UserGroupRight, UserUserGroup } from '@/models/user';
import { ENVIRONMENT } from '@/utils/constants';

const MATOMO_URL = 'https://stats.beta.gouv.fr/';
const MATOMO_SITE_ID = '203';

// Visit-scope Custom Dimensions, created with these ids in site 203.
const DIMENSIONS = {
    role: 1,
    structureType: 2,
    rights: 3,
    department: 4,
    seniority: 5,
} as const;

const NO_GROUP = 'Aucun groupe';
const MAX_LISTED_DEPARTMENTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const RIGHTS_BY_PRIORITY: UserGroupRight[] = ['WRITE', 'ANNOTATE', 'READ'];

// Commands wait in the queue until matomo.js has loaded, so these can be called at any time.
const push = (command: unknown[]) => {
    (window._paq = window._paq || []).push(command);
};

let initialized = false;
let userIdentified = false;

/**
 * Loads the tracker, in production only: elsewhere commands just pile up in window._paq, which
 * keeps preprod and local sessions out of the production stats. Page views are not sent here,
 * they come from MatomoUrlSync (App.tsx).
 */
export const initMatomo = () => {
    if (initialized) {
        return;
    }
    initialized = true;
    window._paq = window._paq || [];

    if (ENVIRONMENT !== 'production') {
        return;
    }

    push(['setTrackerUrl', MATOMO_URL + 'matomo.php']);
    push(['setSiteId', MATOMO_SITE_ID]);
    push(['discardHashTag', true]);
    push(['enableLinkTracking']);
    // Time spent on the last page of a visit (usually /map) is 0 s without it.
    push(['enableHeartBeatTimer']);

    const scriptElt = document.createElement('script');
    const script = document.getElementsByTagName('script')[0];

    scriptElt.async = true;
    scriptElt.src = MATOMO_URL + 'matomo.js';
    script.parentNode?.insertBefore(scriptElt, script);
};

// Department of a commune: 2 chars of its INSEE code, 3 overseas ('97209' -> '972').
const getCommuneDepartmentCode = (inseeCode: string) => inseeCode.slice(0, /^9[78]/.test(inseeCode) ? 3 : 2);

const getDepartmentDimension = (userUserGroups: UserUserGroup[]): string => {
    const codes = new Set<string>();

    userUserGroups.forEach(({ userGroup }) =>
        userGroup.geoZones.forEach(({ geoZoneType, code }) => {
            if (!code) {
                return;
            }

            if (geoZoneType === 'DEPARTMENT') {
                codes.add(code);
            } else if (geoZoneType === 'COMMUNE') {
                codes.add(getCommuneDepartmentCode(code));
            }
        }),
    );

    if (!codes.size) {
        return 'Inconnu';
    }

    return codes.size <= MAX_LISTED_DEPARTMENTS ? Array.from(codes).sort().join(',') : 'Plusieurs';
};

const getAgeBucket = (createdAtMs: number, now: number): string => {
    const days = (now - createdAtMs) / DAY_MS;

    if (Number.isNaN(days)) {
        return 'inconnue';
    }
    if (days < 7) {
        return '< 7 j';
    }
    if (days < 30) {
        return '7-30 j';
    }
    if (days < 183) {
        return '1-6 mois';
    }
    return '> 6 mois';
};

// Account age, and age of the oldest group: activation of new agents and newly deployed groups.
const getSeniorityDimension = (user: User): string => {
    const now = Date.now();
    const groupCreations = user.userUserGroups
        .map(({ userGroup }) => Date.parse(userGroup.createdAt))
        .filter((createdAtMs) => !Number.isNaN(createdAtMs));
    let groupAge = NO_GROUP;
    if (user.userUserGroups.length) {
        groupAge = groupCreations.length ? getAgeBucket(Math.min(...groupCreations), now) : 'inconnue';
    }

    return `compte ${getAgeBucket(Date.parse(user.createdAt), now)} / groupe ${groupAge}`;
};

/**
 * Who the hits belong to. /users/me answers with the impersonated group only for a SUPER_ADMIN
 * scoped to one, so the group dimensions follow that group. Must run before the first
 * authenticated page view.
 */
export const identifyMatomoUser = (user: User) => {
    push(['setUserId', user.email]);
    push(['setCustomVariable', 1, 'userMail', user.email, 'visit']);
    push(['setCustomVariable', 2, 'userUuid', user.uuid, 'visit']);
    push(['setCustomVariable', 3, 'userRole', user.userRole, 'visit']);

    const { userUserGroups } = user;
    const rights = new Set(userUserGroups.flatMap(({ userGroupRights }) => userGroupRights));
    let structureType: string = NO_GROUP;
    if (userUserGroups.some(({ userGroup }) => userGroup.userGroupType === 'DDTM')) {
        structureType = 'DDTM';
    } else if (userUserGroups.length) {
        structureType = 'COLLECTIVITY';
    }

    push(['setCustomDimension', DIMENSIONS.role, user.userRole]);
    push(['setCustomDimension', DIMENSIONS.structureType, structureType]);
    push(['setCustomDimension', DIMENSIONS.rights, RIGHTS_BY_PRIORITY.find((right) => rights.has(right)) ?? 'Aucun']);
    push(['setCustomDimension', DIMENSIONS.department, getDepartmentDimension(userUserGroups)]);
    push(['setCustomDimension', DIMENSIONS.seniority, getSeniorityDimension(user)]);

    userIdentified = true;
};

export const isMatomoUserIdentified = () => userIdentified;

// A session that ends without the reload of logout() (an expired token): whoever logs in next in
// this tab is identified again before their first page view.
export const forgetMatomoUser = () => {
    userIdentified = false;
};

// matomo.js reads the url once, when it loads: without this, every later event, outlink or
// download would be reported on the page the session started on.
export const setTrackedUrl = (url: string) => push(['setCustomUrl', url]);

// matomo.js sends document.referrer, raw, with every hit until this replaces it.
export const setTrackedReferrerUrl = (url: string) => push(['setReferrerUrl', url]);

// Only MatomoUrlSync (App.tsx) sends page views: `url` is already sanitised there.
export const trackPageView = (url: string, title: string, referrerUrl?: string) => {
    if (referrerUrl) {
        setTrackedReferrerUrl(referrerUrl);
    }
    push(['setCustomUrl', url]);
    push(['setDocumentTitle', title]);
    push(['trackPageView']);
};

export const trackEvent = (category: string, action: string, name?: string, value?: number) =>
    push(
        typeof value === 'number' && Number.isFinite(value)
            ? ['trackEvent', category, action, name, value]
            : ['trackEvent', category, action, name],
    );

const trackedOnce = new Set<string>();

// For errors and once-per-load signals: a second call with the same category, action and name is dropped.
export const trackEventOnce = (category: string, action: string, name?: string, value?: number) => {
    const key = [category, action, name ?? ''].join('|');

    if (trackedOnce.has(key)) {
        return;
    }

    trackedOnce.add(key);
    trackEvent(category, action, name, value);
};

// Reported under Behaviour > Site Search, where searches without any result have their own list.
export const trackSiteSearch = (keyword: string, category: string, resultsCount: number) =>
    push(['trackSiteSearch', keyword, category, resultsCount]);
