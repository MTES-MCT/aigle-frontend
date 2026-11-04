import React, { useEffect, useRef, useState } from 'react';

import { SuggestionOption } from '@/components/dsfr/SuggestionsPopup';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';
import { getSuggestionId, useSuggestionsKeyboard } from '@/hooks/useSuggestionsKeyboard';

interface Options {
    // the field id, which the listbox id derives from
    id: string;
    query: string;
    options: SuggestionOption[];
    loading: boolean;
    emptyText?: string;
    onQueryChange: (query: string) => void;
    onPick: (option: SuggestionOption) => void;
}

/**
 * The DSFR-less combobox shared by Autocomplete and MultiAutocomplete: the list opens while the
 * field is focused and holds text, closes on Escape, on a pick and when focus or a press lands
 * outside the field and its portalled list.
 */
export const useCombobox = ({ id, query, options, loading, emptyText, onQueryChange, onPick }: Options) => {
    const listboxId = `${id}-listbox`;
    const fieldRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);

    const opened = focused && !!query;
    const expanded = opened && options.length > 0;
    const message = loading ? 'Recherche en cours…' : emptyText;
    const position = useAnchoredPosition(fieldRef, opened);

    const pick = (option: SuggestionOption) => {
        onPick(option);
        setFocused(false);
    };
    const { activeIndex, onKeyDown: onSuggestionsKeyDown } = useSuggestionsKeyboard(options, expanded, pick);

    useEffect(() => {
        if (!focused) {
            return;
        }

        const closeOnOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;

            if (!fieldRef.current?.contains(target) && !popupRef.current?.contains(target)) {
                setFocused(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [focused]);

    const fieldProps = {
        ref: fieldRef,
        // with the side panel sections kept mounted, a list left open would outlive its field
        onBlur: (event: React.FocusEvent) => {
            const next = event.relatedTarget as Node | null;

            // null: a mouse press, which the outside mousedown handles, or a switch to another window
            if (next && !fieldRef.current?.contains(next) && !popupRef.current?.contains(next)) {
                setFocused(false);
            }
        },
    };

    const inputProps = {
        id,
        name: id,
        value: query,
        autoComplete: 'off',
        role: 'combobox' as const,
        'aria-expanded': expanded,
        'aria-controls': listboxId,
        'aria-activedescendant': activeIndex !== -1 ? getSuggestionId(listboxId, activeIndex) : undefined,
        onFocus: () => setFocused(true),
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                setFocused(false);
            } else if (!focused && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                setFocused(true);
            } else if (expanded) {
                onSuggestionsKeyDown(event);
            }
        },
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setFocused(true);
            onQueryChange(event.currentTarget.value);
        },
    };

    return {
        focused,
        // opens the list from a control next to the field, like the search bar button
        open: () => setFocused(true),
        fieldProps,
        inputProps,
        statusProps: { opened, count: options.length, message },
        popupProps: opened
            ? { ref: popupRef, listboxId, position, options, activeIndex, message, onSelect: pick }
            : undefined,
    };
};
