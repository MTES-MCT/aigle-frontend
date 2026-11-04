import { useEffect, useState } from 'react';
import { getParisNow } from './utils';

const REFRESH_INTERVAL_MS = 30_000;

// Re-renders as time passes, so a page left open shows a webinar starting, then moves it to the past ones.
export const useParisNow = (): string => {
    const [parisNow, setParisNow] = useState(getParisNow);

    useEffect(() => {
        const interval = setInterval(() => setParisNow(getParisNow()), REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    return parisNow;
};
