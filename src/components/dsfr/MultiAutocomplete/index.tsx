import SuggestionsPopup, { SuggestionOption, SuggestionsStatus } from '@/components/dsfr/SuggestionsPopup';
import { useCombobox } from '@/hooks/useCombobox';
import clsx from 'clsx';
import React, { useId, useRef } from 'react';
import classes from './index.module.scss';

interface ComponentProps {
    label: string;
    search: string;
    options: SuggestionOption[];
    selected: SuggestionOption[];
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
    placeholder,
    loading = false,
    disabled = false,
    emptyText,
    onSearchChange,
    onSelect,
    onRemove,
}: ComponentProps) => {
    const id = `multi-autocomplete-${useId()}`;
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedValues = new Set(selected.map((option) => option.value));
    const selectableOptions = options.filter((option) => !selectedValues.has(option.value));
    const combobox = useCombobox({
        id,
        query: search,
        options: selectableOptions,
        loading,
        emptyText,
        onQueryChange: onSearchChange,
        onPick: (option) => {
            onSelect(option);
            onSearchChange('');
        },
    });

    // the removed tag held the focus: on to the next tag, else the previous one, else the field (as DSFR does)
    const remove = (event: React.MouseEvent<HTMLButtonElement>, value: string) => {
        const item = event.currentTarget.closest('li');
        const neighbour = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector('button');

        (neighbour ?? inputRef.current)?.focus();
        onRemove(value);
    };

    return (
        <div className={clsx('fr-input-group', disabled && 'fr-input-group--disabled')}>
            <label className="fr-label" htmlFor={id}>
                {label}
            </label>

            {selected.length ? (
                <ul className={clsx('fr-tags-group', 'fr-tags-group--sm', classes.tags)}>
                    {selected.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                className="fr-tag fr-tag--sm fr-tag--dismiss"
                                aria-label={`Retirer ${option.label}`}
                                disabled={disabled}
                                onClick={(event) => remove(event, option.value)}
                            >
                                {option.label}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div {...combobox.fieldProps}>
                <input
                    ref={inputRef}
                    className="fr-input"
                    type="text"
                    placeholder={placeholder}
                    disabled={disabled}
                    {...combobox.inputProps}
                />
            </div>

            <SuggestionsStatus {...combobox.statusProps} />
            {combobox.popupProps ? <SuggestionsPopup {...combobox.popupProps} /> : null}
        </div>
    );
};

export default Component;
