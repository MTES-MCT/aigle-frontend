import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterValue = string | string[];

// Writes only the keys this filter owns, so params belonging to something else (a sibling
// filter, the selected tab) survive.
const applyFilter = <T extends { [K in keyof T]: FilterValue }>(
    params: URLSearchParams,
    filter: T,
): URLSearchParams => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(filter) as [string, FilterValue][]) {
        const serialized = Array.isArray(value) ? value.join(',') : value;
        if (serialized) {
            next.set(key, serialized);
        } else {
            next.delete(key);
        }
    }
    return next;
};

export const useUrlFilter = <T extends { [K in keyof T]: FilterValue }>(
    initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [filter, setFilterState] = useState<T>(() => {
        const filter = { ...initialValue };

        for (const key of Object.keys(initialValue) as (keyof T & string)[]) {
            const paramValue = searchParams.get(key);
            if (paramValue === null) continue;

            if (Array.isArray(initialValue[key])) {
                (filter[key] as FilterValue) = paramValue ? paramValue.split(',') : [];
            } else {
                (filter[key] as FilterValue) = paramValue;
            }
        }

        return filter;
    });

    useEffect(() => {
        setSearchParams((params) => applyFilter(params, filter), { replace: true });
    }, []);

    // Not in a state updater, which can run mid-render: the url would then commit after the page's own effects.
    const filterRef = useRef(filter);
    filterRef.current = filter;

    const setFilter: React.Dispatch<React.SetStateAction<T>> = useCallback(
        (action) => {
            const next = typeof action === 'function' ? action(filterRef.current) : action;
            filterRef.current = next;
            setFilterState(next);
            setSearchParams((params) => applyFilter(params, next), { replace: true });
        },
        [setSearchParams],
    );

    return [filter, setFilter];
};
