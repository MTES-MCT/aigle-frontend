import React, { ReactNode, useId } from 'react';

interface ComponentProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

// The DSFR toggle (`fr-toggle`): every rule is written as `input ~ .fr-toggle__label`, keep the order.
const Component: React.FC<ComponentProps> = ({ label, checked, onChange }: ComponentProps) => {
    const id = `toggle-${useId()}`;

    return (
        <div className="fr-toggle">
            <input
                type="checkbox"
                className="fr-toggle__input"
                id={id}
                checked={checked}
                onChange={(event) => onChange(event.currentTarget.checked)}
            />
            <label className="fr-toggle__label" htmlFor={id}>
                {label}
            </label>
        </div>
    );
};

export default Component;
