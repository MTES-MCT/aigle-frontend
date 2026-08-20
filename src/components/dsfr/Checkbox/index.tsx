import clsx from 'clsx';
import React, { ReactNode, useId } from 'react';
import classes from './index.module.scss';

interface ComponentProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

// The input must stay the immediate previous sibling of the label: every DSFR checkbox
// rule is written as `input[type=checkbox] + label`.
const Component: React.FC<ComponentProps> = ({ label, checked, onChange }: ComponentProps) => {
    const id = `checkbox-${useId()}`;

    return (
        <div className={clsx('fr-checkbox-group', classes.container)}>
            <input
                type="checkbox"
                id={id}
                name={id}
                checked={checked}
                onChange={(event) => onChange(event.currentTarget.checked)}
            />
            <label className="fr-label" htmlFor={id}>
                {label}
            </label>
        </div>
    );
};

export default Component;
