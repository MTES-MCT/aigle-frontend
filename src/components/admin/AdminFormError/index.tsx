import React from 'react';

import ErrorCard from '@/components/ui/ErrorCard';
import { ApiError } from '@/utils/api';
import { isNetworkError } from '@/utils/tracking';

const toMessages = (value: unknown): string[] => {
    if (typeof value === 'string') {
        return [value];
    }

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

// Field errors are displayed under each field; the rest of the body (a permission `detail`,
// `nonFieldErrors`) is attached to no field, so it has to be displayed here.
const describeError = (error: unknown, fieldNames: readonly string[]) => {
    const body = error instanceof ApiError ? error.body : undefined;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { messages: [], hasFieldErrors: false };
    }

    const entries = Object.entries(body);

    return {
        messages: entries.filter(([key]) => !fieldNames.includes(key)).flatMap(([, value]) => toMessages(value)),
        hasFieldErrors: entries.some(([key]) => fieldNames.includes(key)),
    };
};

interface ComponentProps {
    error: unknown;
    fieldNames: readonly string[];
}

const Component: React.FC<ComponentProps> = ({ error, fieldNames }) => {
    const { messages, hasFieldErrors } = describeError(error, fieldNames);
    let fallbackMessage: string | null = null;

    if (!messages.length && !hasFieldErrors) {
        fallbackMessage = isNetworkError(error)
            ? 'Le serveur n’a pas pu être joint : vérifiez votre connexion, puis réessayez.'
            : 'L’enregistrement a échoué, veuillez réessayer.';
    }

    return (
        <ErrorCard>
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
            {hasFieldErrors ? <p>Voir les indications ci-dessous pour plus d&apos;info</p> : null}
            {fallbackMessage ? <p>{fallbackMessage}</p> : null}
        </ErrorCard>
    );
};

export default Component;
