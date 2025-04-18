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
