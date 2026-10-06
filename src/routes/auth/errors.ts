import { ApiError } from '@/utils/api';
import { isNetworkError } from '@/utils/tracking';

// Only 'rejected' is about what the user typed: the others must not read as a wrong password.
export type AuthErrorCause = 'rejected' | 'throttled' | 'server' | 'network';

export const getAuthErrorCause = (error: unknown): AuthErrorCause => {
    if (error instanceof ApiError) {
        if (error.status === 429) {
            return 'throttled';
        }

        return error.status >= 500 ? 'server' : 'rejected';
    }

    return isNetworkError(error) ? 'network' : 'server';
};

export const AUTH_ERROR_MESSAGES: Record<Exclude<AuthErrorCause, 'rejected'>, string> = {
    throttled: 'Trop de tentatives. Patientez une minute avant de réessayer.',
    server: 'Le service est momentanément indisponible. Réessayez dans quelques instants.',
    network: 'Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez.',
};

// Event names shared by the three auth forms.
export const AUTH_ERROR_TRACKING_NAMES: Record<Exclude<AuthErrorCause, 'rejected'>, string> = {
    throttled: 'Trop de tentatives',
    server: 'Erreur serveur',
    network: 'Erreur réseau',
};
