import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterValue = string | string[];

const serializeFilter = <T extends { [K in keyof T]: FilterValue }>(filter: T): URLSearchParams => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter) as [string, FilterValue][]) {
        const serialized = Array.isArray(value) ? value.join(',') : value;
        if (serialized) {
            params.set(key, serialized);
        }
    }
    return params;
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
        setSearchParams(serializeFilter(filter), { replace: true });
    }, []);

    const setFilter: React.Dispatch<React.SetStateAction<T>> = useCallback(
        (action) => {
            setFilterState((prev) => {
                const next = typeof action === 'function' ? action(prev) : action;
                setSearchParams(serializeFilter(next), { replace: true });
                return next;
            });
        },
        [setSearchParams],
    );

    return [filter, setFilter];
};
