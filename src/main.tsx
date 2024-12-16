import App from '@/App';
import { createTheme, MantineColorsTuple, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
                <Notifications />
                <App />
            </MantineProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
