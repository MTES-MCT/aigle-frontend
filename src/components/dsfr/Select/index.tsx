import clsx from 'clsx';
import React, { ReactNode, useId } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface ComponentProps {
    label: ReactNode;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    labelHidden?: boolean;
    className?: string;
}

// The native DSFR select (`fr-select-group`).
const Component: React.FC<ComponentProps> = ({
    label,
    value,
    options,
    onChange,
    labelHidden = false,
    className,
}: ComponentProps) => {
    const id = `select-${useId()}`;

    return (
        <div className={clsx('fr-select-group', className)}>
            <label className={clsx('fr-label', labelHidden && 'fr-sr-only')} htmlFor={id}>
                {label}
            </label>
            <select
                className="fr-select"
                id={id}
                value={value}
                onChange={(event) => onChange(event.currentTarget.value)}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default Component;
