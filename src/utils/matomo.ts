import { User } from '@/models/user';

export const setupMatomo = (user: User) => {
    const _paq = (window._paq = window._paq || []);

    const url = 'https://stats.beta.gouv.fr/';
    _paq.push(['setTrackerUrl', url + 'matomo.php']);
    _paq.push(['setSiteId', '203']);

    _paq.push(['setUserId', user.email]);
    _paq.push(['setCustomVariable', 1, 'userMail', user.email, 'visit']);
    _paq.push(['setCustomVariable', 2, 'userUuid', user.uuid, 'visit']);
    _paq.push(['setCustomVariable', 3, 'userRole', user.userRole, 'visit']);

    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);

    const scriptElt = document.createElement('script');
    const script = document.getElementsByTagName('script')[0];

    scriptElt.async = true;
    scriptElt.src = url + 'matomo.js';
    script.parentNode?.insertBefore(scriptElt, script);
};

// Commands wait in the queue until matomo.js has loaded, so these can be called at any time.
const push = (command: unknown[]) => {
    (window._paq = window._paq || []).push(command);
};

// matomo.js reads the url once, when it loads: without this, every later event, outlink or
// download would be reported on the page the session started on.
export const setTrackedUrl = (url: string) => push(['setCustomUrl', url]);

export const trackEvent = (category: string, action: string, name?: string) =>
    push(['trackEvent', category, action, name]);

// Reported under Behaviour > Site Search, where searches without any result have their own list.
export const trackSiteSearch = (keyword: string, category: string, resultsCount: number) =>
    push(['trackSiteSearch', keyword, category, resultsCount]);
