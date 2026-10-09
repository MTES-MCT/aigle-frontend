import SuggestionsPopup, { SuggestionOption } from '@/components/dsfr/SuggestionsPopup';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';
import { getSuggestionId, useSuggestionsKeyboard } from '@/hooks/useSuggestionsKeyboard';
import clsx from 'clsx';
import React, { useEffect, useId, useRef, useState } from 'react';
import classes from './index.module.scss';

interface ComponentProps {
    label: string;
    search: string;
    options: SuggestionOption[];
    selected: SuggestionOption[];
    hint?: string;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    emptyText?: string;
    onSearchChange: (search: string) => void;
    onSelect: (option: SuggestionOption) => void;
    onRemove: (value: string) => void;
}

/**
 * Multi-value flavour of the DSFR combobox: the current selection is a DSFR dismissible tag
 * group, the search field below it feeds the same portalled suggestion list. Filtering is the
 * caller's job (these fields query the API), so every option handed in is offered as-is.
 */
const Component: React.FC<ComponentProps> = ({
    label,
    search,
    options,
    selected,
    hint,
    placeholder,
    loading = false,
    disabled = false,
    emptyText,
    onSearchChange,
    onSelect,
    onRemove,
}: ComponentProps) => {
    const id = `multi-autocomplete-${useId()}`;
    const listboxId = `${id}-listbox`;
    const fieldRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);

    const selectedValues = new Set(selected.map((option) => option.value));
    const selectableOptions = options.filter((option) => !selectedValues.has(option.value));

    const opened = focused && !!search;
    const expanded = opened && selectableOptions.length > 0;
    const message = loading ? 'Recherche en cours…' : emptyText;
    const position = useAnchoredPosition(fieldRef, opened);

    const pick = (option: SuggestionOption) => {
        onSelect(option);
        onSearchChange('');
        setFocused(false);
    };
    const { activeIndex, onKeyDown: onSuggestionsKeyDown } = useSuggestionsKeyboard(selectableOptions, expanded, pick);

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

    return (
        <div className={clsx('fr-input-group', disabled && 'fr-input-group--disabled')}>
            <label className="fr-label" htmlFor={id}>
                {label}
                {hint ? <span className="fr-hint-text">{hint}</span> : null}
            </label>

            {selected.length ? (
                <ul className={clsx('fr-tags-group', 'fr-tags-group--sm', classes.tags)}>
                    {selected.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                className="fr-tag fr-tag--sm fr-tag--dismiss"
                                disabled={disabled}
                                onClick={() => onRemove(option.value)}
                            >
                                {option.label}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div
                ref={fieldRef}
                onBlur={(event) => {
                    const next = event.relatedTarget as Node | null;

                    // null: a mouse press, which the outside mousedown handles, or a switch to another window
                    if (next && !fieldRef.current?.contains(next) && !popupRef.current?.contains(next)) {
                        setFocused(false);
                    }
                }}
            >
                <input
                    id={id}
                    name={id}
                    className="fr-input"
                    type="text"
                    value={search}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={expanded}
                    aria-controls={listboxId}
                    aria-activedescendant={activeIndex !== -1 ? getSuggestionId(listboxId, activeIndex) : undefined}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            setFocused(false);
                        } else if (!focused && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                            setFocused(true);
                        } else if (expanded) {
                            onSuggestionsKeyDown(event);
                        }
                    }}
                    onChange={(event) => {
                        setFocused(true);
                        onSearchChange(event.currentTarget.value);
                    }}
                />
            </div>

            {opened ? (
                <SuggestionsPopup
                    ref={popupRef}
                    listboxId={listboxId}
                    position={position}
                    options={selectableOptions}
                    activeIndex={activeIndex}
                    message={message}
                    onSelect={pick}
                />
            ) : null}
        </div>
    );
};

export default Component;
