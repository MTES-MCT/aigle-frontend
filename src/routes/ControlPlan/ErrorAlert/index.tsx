import React from 'react';

import { getErrorMessages } from '@/routes/ControlPlan/utils';
import clsx from 'clsx';

interface ComponentProps {
    error: unknown;
    fallback: string;
    className?: string;
}

// The DSFR small error alert with what the API said, or the fallback.
const Component: React.FC<ComponentProps> = ({ error, fallback, className }: ComponentProps) => (
    <div className={clsx('fr-alert fr-alert--error fr-alert--sm', className)} role="alert">
        {getErrorMessages(error, fallback).map((message) => (
            <p key={message}>{message}</p>
        ))}
    </div>
);

export default Component;
