import SuggestionsPopup, { SuggestionOption } from '@/components/dsfr/SuggestionsPopup';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';
import clsx from 'clsx';
import React, { useEffect, useId, useRef, useState } from 'react';

export type AutocompleteOption = SuggestionOption;

interface ComponentProps {
    label: string;
    value: string;
    options: AutocompleteOption[];
    // 'search' renders the DSFR search bar (label hidden by DSFR, submit button attached)
    variant?: 'input' | 'search';
    hint?: string;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    emptyText?: string;
    onChange: (value: string) => void;
    onSelect: (option: AutocompleteOption) => void;
}

/** DSFR ships no combobox, so this pairs a DSFR field with a portalled suggestion list. */
const Component: React.FC<ComponentProps> = ({
    label,
    value,
    options,
    variant = 'input',
    hint,
    placeholder,
    loading = false,
    disabled = false,
    emptyText,
    onChange,
    onSelect,
}: ComponentProps) => {
    const id = `autocomplete-${useId()}`;
    const fieldRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);

    const opened = focused && !!value;
    const expanded = opened && options.length > 0;
    const message = loading ? 'Recherche en cours…' : emptyText;
    const position = useAnchoredPosition(fieldRef, opened);

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

    const inputProps = {
        id,
        name: id,
        value,
        placeholder,
        disabled,
        autoComplete: 'off',
        role: 'combobox' as const,
        'aria-expanded': expanded,
        'aria-controls': `${id}-listbox`,
        onFocus: () => setFocused(true),
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => event.key === 'Escape' && setFocused(false),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setFocused(true);
            onChange(event.currentTarget.value);
        },
    };

    return (
        <div
            className={clsx(
                variant === 'input' && 'fr-input-group',
                variant === 'input' && disabled && 'fr-input-group--disabled',
            )}
        >
            <div ref={fieldRef}>
                {variant === 'search' ? (
                    <div className="fr-search-bar" role="search">
                        <label className="fr-label" htmlFor={id}>
                            {label}
                        </label>
                        <input className="fr-input" type="search" {...inputProps} />
                        <button type="button" className="fr-btn" title={label} onClick={() => setFocused(true)}>
                            {label}
                        </button>
                    </div>
                ) : (
                    <>
                        <label className="fr-label" htmlFor={id}>
                            {label}
                            {hint ? <span className="fr-hint-text">{hint}</span> : null}
                        </label>
                        <input className="fr-input" type="text" {...inputProps} />
                    </>
                )}
            </div>

            {opened ? (
                <SuggestionsPopup
                    ref={popupRef}
                    listboxId={`${id}-listbox`}
                    position={position}
                    options={options}
                    message={message}
                    onSelect={(option) => {
                        onSelect(option);
                        setFocused(false);
                    }}
                />
            ) : null}
        </div>
    );
};

export default Component;
