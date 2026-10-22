import { useEffect, useRef, useState } from 'react';

import { Paginated } from '@/models/data';
import { PaginationOffsetLimit } from '@/models/table';
import api from '@/utils/api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

interface Options<T_DATA> {
    initialLimit: number;
    enabled: boolean;
    // each result set the list settles on, never the previous page shown while loading
    onDataSettled?: (data: T_DATA[]) => void;
}

/**
 * The paginated half of the shared DataTable, for the DSFR table of /table. The query key keeps
 * DataTable's shape (`[endpoint, limit, offset, ...filter values]`) so that invalidating
 * `[endpoint]` after a bulk edit still refreshes it.
 */
export const usePaginatedList = <T_DATA, T_FILTER extends object>(
    endpoint: string,
    filter: T_FILTER,
    { initialLimit, enabled, onDataSettled }: Options<T_DATA>,
) => {
    const [pagination, setPagination] = useState<PaginationOffsetLimit>({ offset: 0, limit: initialLimit });

    // back to the first page when what is listed changes
    useEffect(() => {
        setPagination((prev) => ({ ...prev, offset: 0, total: undefined }));
    }, [endpoint, filter, pagination.limit]);

    const query = useQuery({
        queryKey: [endpoint, pagination.limit, pagination.offset, ...Object.values(filter)],
        queryFn: async ({ signal }) => {
            const res = await api<Paginated<T_DATA>>(endpoint, {
                params: { limit: pagination.limit, offset: pagination.offset, ...filter },
                signal,
            });
            setPagination((prev) => ({ ...prev, total: res.count }));
            return res.results;
        },
        placeholderData: keepPreviousData,
        enabled,
    });

    // kept in a ref so that a new callback on each parent render does not report the same data again
    const onDataSettledRef = useRef(onDataSettled);
    useEffect(() => {
        onDataSettledRef.current = onDataSettled;
    });
    useEffect(() => {
        if (query.data && !query.isPlaceholderData) {
            onDataSettledRef.current?.(query.data);
        }
    }, [query.data, query.isPlaceholderData]);

    return { ...query, pagination, setPagination };
};
