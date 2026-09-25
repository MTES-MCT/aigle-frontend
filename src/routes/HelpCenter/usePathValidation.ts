import { helpCenterEndpoints } from '@/api/endpoints';
import { PathValidationProgress, PathValidationProgressInput } from '@/models/help-center';
import { useAuth } from '@/store/slices/auth';
import api from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PATH_VALIDATION_CHECKLIST_ID } from './content/exercises';

type PathValidationChange = Omit<PathValidationProgressInput, 'itemCount'>;

const MUTATION_KEY = [helpCenterEndpoints.pathValidation];

const applyChange = (
    progress: PathValidationProgress,
    { check = [], uncheck = [] }: PathValidationChange,
): PathValidationProgress => {
    const checkedItems = Array.from(new Set([...progress.checkedItems, ...check]))
        .filter((index) => !uncheck.includes(index))
        .sort((a, b) => a - b);

    return { ...progress, checkedItems, checkedCount: checkedItems.length };
};

export const usePathValidation = (itemCount: number) => {
    const { userMe } = useAuth();
    const queryClient = useQueryClient();
    const [saveError, setSaveError] = useState(false);
    const migrationStarted = useRef(false);
    const queryKey = [helpCenterEndpoints.pathValidation, userMe?.uuid];

    // A pending write is itself still counted inside its own callbacks.
    const pendingWritesCount = () => queryClient.isMutating({ mutationKey: MUTATION_KEY });

    const query = useQuery({
        queryKey,
        enabled: !!userMe,
        queryFn: ({ signal }) => api<PathValidationProgress>(helpCenterEndpoints.pathValidation, { signal }),
        // Lets a second tab catch up, without overwriting the optimistic state of a pending write.
        refetchOnWindowFocus: () => pendingWritesCount() === 0,
    });

    const { mutate, mutateAsync } = useMutation({
        mutationKey: MUTATION_KEY,
        // Sends the PATCHes one at a time in click order; onMutate still runs at once.
        scope: { id: 'help-center-path-validation' },
        mutationFn: (change: PathValidationChange) =>
            api<PathValidationProgress>(helpCenterEndpoints.pathValidation, {
                method: 'PATCH',
                body: { itemCount, ...change },
            }),
        onMutate: async (change) => {
            await queryClient.cancelQueries({ queryKey });
            queryClient.setQueryData<PathValidationProgress>(
                queryKey,
                (current) => current && applyChange(current, change),
            );
        },
        onSuccess: async (data) => {
            setSaveError(false);
            // An earlier response would briefly undo the ticks still queued behind it.
            if (pendingWritesCount() === 1) {
                // A GET started meanwhile (e.g. on remount) must not land after this fresher state.
                await queryClient.cancelQueries({ queryKey });
                queryClient.setQueryData(queryKey, data);
            }
        },
        onError: () => {
            setSaveError(true);
            // No rollback to a snapshot: it would undo the ticks queued behind this write.
            if (pendingWritesCount() === 1) {
                queryClient.invalidateQueries({ queryKey });
            }
        },
    });

    // One-time merge of the ticks this checklist used to keep in local storage.
    useEffect(() => {
        if (!query.isSuccess || !userMe || migrationStarted.current) {
            return;
        }
        migrationStarted.current = true;

        const key = `help-center-checklist-${userMe.uuid}-${PATH_VALIDATION_CHECKLIST_ID}`;
        let stored: string | null;
        try {
            stored = localStorage.getItem(key);
        } catch {
            return;
        }

        if (stored === null) {
            return;
        }

        const removeKey = () => localStorage.removeItem(key);
        let parsed: unknown;
        try {
            parsed = JSON.parse(stored);
        } catch {
            removeKey();
            return;
        }

        const indices = Array.isArray(parsed)
            ? Array.from(new Set(parsed)).filter(
                  (index): index is number => Number.isInteger(index) && index >= 0 && index < itemCount,
              )
            : [];
        const missing = indices.filter((index) => !query.data.checkedItems.includes(index));

        if (!missing.length) {
            removeKey();
            return;
        }

        // mutateAsync: per-call callbacks of mutate() are dropped if a click fires another mutate() meanwhile.
        mutateAsync({ check: missing }).then(removeKey, () => undefined);
    }, [query.isSuccess, query.data, userMe, itemCount, mutateAsync]);

    return {
        checked: (query.data?.checkedItems ?? []).filter((index) => index < itemCount),
        isLoading: query.isLoading,
        // A failed background refetch keeps the data already shown.
        loadError: query.isLoadingError,
        saveError,
        toggle: (index: number, isChecked: boolean) => mutate(isChecked ? { check: [index] } : { uncheck: [index] }),
        reset: () => mutate({ uncheck: Array.from({ length: itemCount }, (_, index) => index) }),
    };
};
