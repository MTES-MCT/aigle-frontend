import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface PaginationConfig {
    page: number;
    limit: number;
    total?: number;
}

interface UsePaginatedDataOptions<TFilter = Record<string, unknown>> {
    initialPagination?: Partial<PaginationConfig>;
    filter?: TFilter;
    enabled?: boolean;
}

export const usePaginatedData = <TData = unknown, TFilter = Record<string, unknown>>(
    endpoint: string,
    options: UsePaginatedDataOptions<TFilter> = {},
) => {
    const { initialPagination = {}, filter = {} as TFilter, enabled = true } = options;

    const [pagination, setPagination] = useState<PaginationConfig>({
        page: 1,
        limit: 20,
        ...initialPagination,
    });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [endpoint, pagination.page, pagination.limit, filter],
        queryFn: async () => {
            const params = {
                page: pagination.page,
                page_size: pagination.limit,
                ...filter,
            };

            const response = await api.get<{
                results: TData[];
                count: number;
                next: string | null;
                previous: string | null;
            }>(endpoint, { params });

            setPagination((prev) => ({
                ...prev,
                total: response.data.count,
            }));

            return response.data;
        },
        enabled,
    });

    const updatePagination = (updates: Partial<PaginationConfig>) => {
        setPagination((prev) => ({ ...prev, ...updates }));
    };

    const goToPage = (page: number) => {
        updatePagination({ page });
    };

    const changePageSize = (limit: number) => {
        updatePagination({ page: 1, limit });
    };

    const totalPages = pagination.total ? Math.ceil(pagination.total / pagination.limit) : 0;

    return {
        data: data?.results || [],
        pagination: {
            ...pagination,
            totalPages,
        },
        isLoading,
        error,
        refetch,
        updatePagination,
        goToPage,
        changePageSize,
    };
};
