import SuggestionsPopup, { SuggestionOption, SuggestionsStatus } from '@/components/dsfr/SuggestionsPopup';
import { useCombobox } from '@/hooks/useCombobox';
import clsx from 'clsx';
import React, { useId } from 'react';

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
    // 'input' only: a suggestion is picked (DSFR valid state, `validMessage`); otherwise typed text shows `unselectedError`
    selected?: boolean;
    validMessage?: string;
    unselectedError?: string;
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
    selected = false,
    validMessage,
    unselectedError,
    onChange,
    onSelect,
}: ComponentProps) => {
    const id = `autocomplete-${useId()}`;
    const messagesId = `${id}-messages`;
    const combobox = useCombobox({
        id,
        query: value,
        options,
        loading,
        emptyText,
        onQueryChange: onChange,
        onPick: onSelect,
    });

    // once the list is closed, not while the agent is still typing
    const errorShown =
        variant === 'input' && !!unselectedError && !!value && !selected && !combobox.focused && !disabled;
    const validShown = variant === 'input' && selected && !disabled;
    const hasMessages = variant === 'input' && (!!unselectedError || !!validMessage);
    const inputProps = {
        ...combobox.inputProps,
        placeholder,
        disabled,
        'aria-describedby': hasMessages ? messagesId : undefined,
    };

    return (
        <div
            className={clsx(
                variant === 'input' && 'fr-input-group',
                variant === 'input' && disabled && 'fr-input-group--disabled',
                errorShown && 'fr-input-group--error',
                validShown && 'fr-input-group--valid',
            )}
        >
            <div {...combobox.fieldProps}>
                {variant === 'search' ? (
                    <div className="fr-search-bar" role="search">
                        <label className="fr-label" htmlFor={id}>
                            {label}
                        </label>
                        <input className="fr-input" type="search" {...inputProps} />
                        <button type="button" className="fr-btn" title={label} onClick={combobox.open}>
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

            {/* outside the box the list is anchored to, so the list opens right under the input */}
            {hasMessages ? (
                <div className="fr-messages-group" id={messagesId} aria-live="polite">
                    {errorShown ? <p className="fr-message fr-message--error">{unselectedError}</p> : null}
                    {validShown && validMessage ? <p className="fr-message fr-message--valid">{validMessage}</p> : null}
                </div>
            ) : null}

            <SuggestionsStatus {...combobox.statusProps} />
            {combobox.popupProps ? <SuggestionsPopup {...combobox.popupProps} /> : null}
        </div>
    );
};

export default Component;
