import { useCallback, useState } from 'react';

/**
 * Open/closed state for a group of DSFR accordions. Sections are independent: DSFR's own
 * exclusive-group behaviour is a JS-runtime feature the app does not load.
 */
export const useExpandedSections = <T extends string>(initiallyExpanded: readonly T[]) => {
    const [expanded, setExpanded] = useState<Set<T>>(() => new Set(initiallyExpanded));

    const toggleSection = useCallback((section: T, isExpanded: boolean) => {
        setExpanded((prev) => {
            const next = new Set(prev);

            if (isExpanded) {
                next.add(section);
            } else {
                next.delete(section);
            }

            return next;
        });
    }, []);

    const isExpanded = useCallback((section: T) => expanded.has(section), [expanded]);

    return { isExpanded, toggleSection };
};
