import { useCallback } from 'react';
import { NavigateOptions, useLocation, useNavigate } from 'react-router-dom';

import { mergeSearchIntoPath } from '@/utils/url-params';

/**
 * Navigation that preserves the current URL query string.
 *
 * Admin lists store their filters (q, statuses, ...) in the URL via `useUrlFilter`. This hook
 * carries that query string onto the target path, so moving between a list and its forms keeps
 * the active filters alive across the round-trip (list → form → back to list).
 *
 *   const { navigate, buildPath } = useFilterNavigation();
 *   navigate(`/admin/tile-sets/form/${uuid}`);        // programmatic — keeps current filters
 *   <Link to={buildPath('/admin/tile-sets')} />       // link href — keeps current filters
 */
export const useFilterNavigation = () => {
    const routerNavigate = useNavigate();
    const { search } = useLocation();

    const buildPath = useCallback((path: string) => mergeSearchIntoPath(path, search), [search]);

    const navigate = useCallback(
        (path: string, options?: NavigateOptions) => routerNavigate(buildPath(path), options),
        [routerNavigate, buildPath],
    );

    return { navigate, buildPath };
};
