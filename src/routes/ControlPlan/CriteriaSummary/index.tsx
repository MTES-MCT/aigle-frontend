import React from 'react';

import { CriteriaSummary } from '@/routes/ControlPlan/criteria';
import clsx from 'clsx';
import classes from './index.module.scss';

const ROWS: { key: keyof CriteriaSummary; label: string }[] = [
    { key: 'perimeter', label: 'Périmètre' },
    { key: 'zones', label: 'Zones à enjeux' },
    { key: 'objectTypes', label: 'Objets' },
    { key: 'filters', label: 'Filtres' },
    { key: 'ranking', label: 'Classement' },
];

interface ComponentProps {
    summary: CriteriaSummary;
    className?: string;
}

// The criteria of a wave in words, one line each.
const Component: React.FC<ComponentProps> = ({ summary, className }: ComponentProps) => (
    <dl className={clsx(classes.list, className)}>
        {ROWS.map(({ key, label }) => (
            <div key={key} className={classes.row}>
                <dt>{label}</dt>
                <dd>{summary[key]}</dd>
            </div>
        ))}
    </dl>
);

export default Component;
