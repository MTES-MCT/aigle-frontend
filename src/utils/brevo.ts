import { User } from '@/models/user';
import { ENVIRONMENT } from '@/utils/constants';

// Brevo Conversations, the support chat widget. Loaded from here rather than from
// index.html so it only exists for a signed-in user: it has nothing to offer on
// the login screen, and an anonymous visitor should not be served a third-party
// script at all.

const WIDGET_URL = 'https://conversations-widget.brevo.com/brevo-conversations.js';
const CONVERSATIONS_ID = '69c2523d2fbf2113de0f3f55';
const GROUP_ID = 'xmdB79sWLngdvYB7d';

// the widget keeps the visitor id (and thread) under these localStorage/cookie namespaces
const STORAGE_PREFIXES = ['BrevoConversations.', 'SibConversations.'];

type BrevoCommandQueue = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
    interface Window {
        BrevoConversationsID?: string;
        BrevoConversationsSetup?: Record<string, unknown>;
        BrevoConversations?: BrevoCommandQueue;
    }
}

export const setupBrevo = (user: User) => {
    // Off in local dev (a developer session should not reach the live support inbox);
    // on in preprod + production, matching how Sentry is gated in main.tsx.
    if (ENVIRONMENT === 'development') {
        return;
    }

    // bootstrap runs twice under StrictMode, and again on every super-admin scope
    // switch — without this guard a second widget stacks on the first
    if (!window.BrevoConversations) {
        window.BrevoConversationsID = CONVERSATIONS_ID;
        window.BrevoConversationsSetup = {
            groupId: GROUP_ID,
            buttonPosition: 'br',
            // above the map + detail panel (100) so it stays reachable, below Mantine
            // modals (200); the open panel clears dropdowns (500), under notifications (2000)
            zIndex: 190,
            expandedZIndex: 1500,
            colors: {
                buttonBg: '#117f58', // aigleColors[6]
                visitorBubbleBg: '#117f58',
                agentBubbleBg: '#ededed',
            },
        };

        // commands issued before the widget finishes loading are replayed on init
        const queue: BrevoCommandQueue = (...args) => {
            (queue.q = queue.q || []).push(args);
        };
        window.BrevoConversations = queue;

        const scriptElt = document.createElement('script');
        scriptElt.async = true;
        scriptElt.src = WIDGET_URL;
        document.head.appendChild(scriptElt);
    }

    // Tell the agent who they are talking to. The user model has no name, so email is
    // the display handle (same choice as matomo.ts); the rest show as custom attributes.
    window.BrevoConversations('updateIntegrationData', {
        email: user.email,
        uuid: user.uuid,
        role: user.userRole,
        userGroup: user.userUserGroups[0]?.userGroup.name ?? '',
    });
};

// On a shared DDTM/collectivity workstation, Brevo's persisted visitor id would hand
// the next user the previous user's conversation. Wipe it on logout.
export const resetBrevo = () => {
    for (const key of Object.keys(localStorage)) {
        if (STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
            localStorage.removeItem(key);
        }
    }

    for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (STORAGE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    }
};
