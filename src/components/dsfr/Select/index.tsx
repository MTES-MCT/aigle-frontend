import clsx from 'clsx';
import React, { ReactNode, useId } from 'react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface ComponentProps {
    label: ReactNode;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    hint?: ReactNode;
    error?: ReactNode;
    disabled?: boolean;
    // shown while `value` is empty, never selectable again
    placeholder?: string;
    labelHidden?: boolean;
    className?: string;
}

// The native DSFR select (`fr-select-group`): label, optional hint and error message.
const Component: React.FC<ComponentProps> = ({
    label,
    value,
    options,
    onChange,
    hint,
    error,
    disabled = false,
    placeholder,
    labelHidden = false,
    className,
}: ComponentProps) => {
    const id = `select-${useId()}`;
    const messagesId = `${id}-messages`;

    return (
        <div
            className={clsx(
                'fr-select-group',
                error && 'fr-select-group--error',
                disabled && 'fr-select-group--disabled',
                className,
            )}
        >
            <label className={clsx('fr-label', labelHidden && 'fr-sr-only')} htmlFor={id}>
                {label}
                {hint ? <span className="fr-hint-text">{hint}</span> : null}
            </label>
            <select
                className="fr-select"
                id={id}
                value={value}
                disabled={disabled}
                aria-describedby={error ? messagesId : undefined}
                onChange={(event) => onChange(event.currentTarget.value)}
            >
                {placeholder !== undefined ? (
                    <option value="" disabled hidden>
                        {placeholder}
                    </option>
                ) : null}
                {options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="fr-messages-group" id={messagesId} aria-live="polite">
                {error ? <p className="fr-message fr-message--error">{error}</p> : null}
            </div>
        </div>
    );
};

export default Component;
