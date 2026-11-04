import React from 'react';

import OptionalText from '@/components/ui/OptionalText';
import classes from './index.module.scss';

interface ComponentProps {
    labels: string[];
}

// Static DSFR tags, one per line: a long name is never cut, the table scrolls instead.
const Component: React.FC<ComponentProps> = ({ labels }: ComponentProps) => {
    if (!labels.length) {
        return <OptionalText />;
    }

    return (
        <ul className={classes.tags}>
            {labels.map((label, index) => (
                <li key={`${label}-${index}`}>
                    <p className="fr-tag fr-tag--sm">{label}</p>
                </li>
            ))}
        </ul>
    );
};

export default Component;
