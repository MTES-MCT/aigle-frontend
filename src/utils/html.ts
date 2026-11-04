import { HEADER_HEIGHT_PX } from '@/utils/constants';

// the id of the <main> of every page: target of the « Contenu » skip link, and where popups are portalled
export const MAIN_CONTENT_ID = 'contenu';

export const getPageTitle = (title?: string) => (title ? `${title} | Aigle` : 'Aigle');

// scrolls the page to the element, which would otherwise end up under the fixed header
export const scrollBelowHeader = (element: HTMLElement | null) => {
    if (element) {
        window.scrollTo({
            top: element.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT_PX,
            behavior: 'smooth',
        });
    }
};

/**
 * Locks the page scroll under a DSFR modal the way the DSFR JS does (`data-fr-scrolling` fixes the
 * body in place) and returns the unlock, which puts the page back where it was.
 */
export const lockPageScroll = () => {
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.setAttribute('data-fr-scrolling', 'false');
    document.body.style.top = `${-scrollY}px`;
    if (scrollbarWidth > 0) {
        root.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    }

    return () => {
        root.removeAttribute('data-fr-scrolling');
        document.body.style.top = '';
        root.style.removeProperty('--scrollbar-width');
        window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
};

// the tags the DSFR modal leaves Escape to (`_escape` in its modal.js)
const ESCAPE_KEEPING_TAGS = ['INPUT', 'LABEL', 'TEXTAREA', 'SELECT', 'AUDIO', 'VIDEO'];

export const isEscapeKeptByFocusedField = () =>
    !!document.activeElement && ESCAPE_KEEPING_TAGS.includes(document.activeElement.tagName);
