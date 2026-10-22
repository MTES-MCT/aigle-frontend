import clsx from 'clsx';
import React, { ReactNode, useId } from 'react';

interface ComponentProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    hint?: ReactNode;
    labelLeft?: boolean;
    className?: string;
}

// The DSFR toggle (`fr-toggle`): every rule is written as `input ~ .fr-toggle__label`, keep the order.
const Component: React.FC<ComponentProps> = ({
    label,
    checked,
    onChange,
    hint,
    labelLeft = false,
    className,
}: ComponentProps) => {
    const id = `toggle-${useId()}`;
    const hintId = `${id}-hint`;

    return (
        <div className={clsx('fr-toggle', labelLeft && 'fr-toggle--label-left', className)}>
            <input
                type="checkbox"
                className="fr-toggle__input"
                id={id}
                checked={checked}
                aria-describedby={hint ? hintId : undefined}
                onChange={(event) => onChange(event.currentTarget.checked)}
            />
            <label className="fr-toggle__label" htmlFor={id}>
                {label}
            </label>
            {hint ? (
                <p className="fr-hint-text" id={hintId}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
};

export default Component;
