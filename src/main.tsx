import App from '@/App';
import { ENVIRONMENT, RELEASE } from '@/utils/constants';
import { createTheme, MantineColorsTuple, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';

const aigleColors: MantineColorsTuple = [
    '#0fffaf',
    '#16eb9e',
    '#19cd86',
    '#18ae77',
    '#169767',
    '#138a5d',
    '#117f58',
    '#05704b',
    '#006442',
    '#005637',
];

const theme = createTheme({
    primaryColor: 'aigleColors',
    colors: {
        aigleColors,
    },
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 0,
            refetchOnWindowFocus: false,
        },
    },
});

Sentry.init({
    dsn: 'https://e487849ee3fdadf339480cee30285f52@sentry.incubateur.net/314',
    environment: ENVIRONMENT,
    enabled: ENVIRONMENT !== 'development',
    release: RELEASE,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    ignoreErrors: [
        'AbortError', // request cancelled by the user navigating/panning away
        'ResizeObserver loop', // benign browser warning, no impact
        'AJAXError', // mapbox tile/sprite fetch failures (404s on missing tiles)
    ],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
    // The map fires hundreds of tile requests per pan — left alone they evict
    // every useful breadcrumb from the 100-entry buffer.
    beforeBreadcrumb: (breadcrumb) => {
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
            const url: string = breadcrumb.data?.url || '';

            if (url.includes('tiles.aigle') || url.includes('api.mapbox.com') || /\/\d+\/\d+\/\d+(\.\w+)?$/.test(url)) {
                return null;
            }
        }

        return breadcrumb;
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
                <Notifications position="top-right" zIndex={2000} />
                <App />
            </MantineProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
