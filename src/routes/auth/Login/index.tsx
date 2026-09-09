import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { isEmail, useForm, UseFormReturnType } from '@mantine/form';
import React, { useEffect, useRef, useState } from 'react';

import { authEndpoints } from '@/api/endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import WarningCard from '@/components/ui/WarningCard';
import {
    AUTH_ERROR_MESSAGES,
    AUTH_ERROR_TRACKING_NAMES,
    AuthErrorCause,
    getAuthErrorCause,
} from '@/routes/auth/errors';
import { useAuth } from '@/store/slices/auth';
import api, { ApiError, trackPendingSessionClosed } from '@/utils/api';
import { ENVIRONMENT } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { LoginRedirectState } from '@/utils/ProtectedRoute';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { IconMail } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

interface JwtAuthResponse {
    access: string;
    refresh: string;
}

interface MfaChallengeResponse {
    mfaRequired: true;
}

type LoginResponse = JwtAuthResponse | MfaChallengeResponse;

const isMfaChallenge = (data: LoginResponse): data is MfaChallengeResponse => 'mfaRequired' in data;

interface FormValues {
    email: string;
    password: string;
}

interface ErrorBody {
    detail?: string;
    nonFieldErrors?: string[];
    code?: unknown;
}

const LOGIN_ERRORS = {
    INVALID_CREDENTIALS: {
        message: 'Aucun compte actif trouvé avec ces identifiants.',
        trackingName: 'Identifiants invalides',
    },
    ACCOUNT_INACTIVE: { message: 'Ce compte est inactif.', trackingName: 'Compte désactivé' },
    ACCOUNT_DEACTIVATED: { message: 'Votre compte est désactivé.', trackingName: 'Compte désactivé' },
} as const;

type LoginErrorCode = keyof typeof LOGIN_ERRORS;

const login = (user: FormValues) => api<LoginResponse>(authEndpoints.login, { method: 'POST', body: user });

interface LinkSentProps {
    email: string;
    onRestart: () => void;
}

const LinkSent: React.FC<LinkSentProps> = ({ email, onRestart }: LinkSentProps) => (
    <LayoutAuth title="Connexion - lien envoyé">
        <Alert mt="md" variant="light" color="blue" title="Vérifiez votre boîte mail" icon={<IconMail />}>
            <p>
                Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>.
            </p>
            <p>Ouvrez-le pour terminer votre connexion. Il est valable 10 minutes et ne fonctionne qu&apos;une fois.</p>
            <p>Si vous ne le voyez pas, pensez à regarder dans vos courriers indésirables.</p>
        </Alert>
        <Button mt="md" variant="subtle" onClick={onRestart}>
            Recommencer la connexion
        </Button>
    </LayoutAuth>
);

const getRejectionBody = (error: unknown): ErrorBody | undefined => {
    const body = error instanceof ApiError ? error.body : undefined;
    return body && typeof body === 'object' ? (body as ErrorBody) : undefined;
};

const getLoginErrorCode = (error: unknown): LoginErrorCode | undefined => {
    const code = getRejectionBody(error)?.code;
    return typeof code === 'string' && Object.keys(LOGIN_ERRORS).includes(code) ? (code as LoginErrorCode) : undefined;
};

// Fallback for an API that sends no code: only its French message tells the account state.
const DEACTIVATED_ACCOUNT_MESSAGE = /désactivé|inactif/i;

const getLoginTrackingName = (error: unknown, cause: AuthErrorCause): string => {
    if (cause !== 'rejected') {
        return AUTH_ERROR_TRACKING_NAMES[cause];
    }

    const code = getLoginErrorCode(error);
    if (code) {
        return LOGIN_ERRORS[code].trackingName;
    }

    const nonFieldError = getRejectionBody(error)?.nonFieldErrors?.[0];
    if (nonFieldError) {
        return DEACTIVATED_ACCOUNT_MESSAGE.test(nonFieldError) ? 'Compte désactivé' : 'Identifiants invalides';
    }

    return error instanceof ApiError && error.status === 401 ? 'Identifiants invalides' : 'Requête invalide';
};

const getLoginErrorMessage = (error: unknown, cause: AuthErrorCause): string => {
    if (cause !== 'rejected') {
        return AUTH_ERROR_MESSAGES[cause];
    }

    const code = getLoginErrorCode(error);
    if (code) {
        return LOGIN_ERRORS[code].message;
    }

    const body = getRejectionBody(error);
    return body?.nonFieldErrors?.[0] ?? body?.detail ?? 'Identifiants invalides';
};

const Component: React.FC = () => {
    const { setAccessToken, setRefreshToken } = useAuth();
    const [errorMessage, setErrorMessage] = useState<string>();
    const [mfaSentTo, setMfaSentTo] = useState<string>();
    const failedSubmitsRef = useRef(0);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        trackPendingSessionClosed();
    }, []);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            email: '',
            password: '',
        },

        validate: {
            email: isEmail("Le format de l'adresse mail est invalide"),
        },
    });

    const mutation: UseMutationResult<LoginResponse, Error, FormValues> = useMutation({
        mutationFn: login,
        onSuccess: (data, variables) => {
            if (isMfaChallenge(data)) {
                setMfaSentTo(variables.email);
                return;
            }

            trackEvent(TRACKING_CATEGORIES.account, 'Connexion tentée', 'Réussie', failedSubmitsRef.current);

            // Back to the page that sent the user here, before the bootstrap reads the url.
            const from = (location.state as LoginRedirectState | null)?.from;
            if (from) {
                navigate(`${from.pathname}${from.search}${from.hash}`, { replace: true });
            }

            setAccessToken(data.access);
            setRefreshToken(data.refresh);
        },
        onError: (error) => {
            const cause = getAuthErrorCause(error);

            failedSubmitsRef.current += 1;
            trackEvent(TRACKING_CATEGORIES.account, 'Connexion tentée', getLoginTrackingName(error, cause));
            setErrorMessage(getLoginErrorMessage(error, cause));

            const body = getRejectionBody(error);
            if (body) {
                form.setErrors(body as Record<string, string>);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    if (mfaSentTo) {
        return (
            <LinkSent
                email={mfaSentTo}
                onRestart={() => {
                    setMfaSentTo(undefined);
                    setErrorMessage(undefined);
                    mutation.reset();
                    form.reset();
                }}
            />
        );
    }

    return (
        <LayoutAuth>
            {ENVIRONMENT === 'preprod' ? (
                <WarningCard title="Environement de pré-production">
                    <p>Vous êtes actuellement connecté à l&apos;environement de pré-production</p>
                    <p>
                        Pour accéder à la version classique, veuillez cliquer ci-dessous:
                        <Button mt="md" fullWidth component={Link} to="https://aigle.beta.gouv.fr/">
                            AIGLE
                        </Button>
                    </p>
                </WarningCard>
            ) : null}

            <form className={classes.form} onSubmit={form.onSubmit(handleSubmit)}>
                {errorMessage ? <ErrorCard className={classes['error-card']}>{errorMessage}</ErrorCard> : null}
                <TextInput
                    mt="md"
                    withAsterisk
                    label="Email"
                    placeholder="jean.dupont@email.com"
                    key={form.key('email')}
                    {...form.getInputProps('email')}
                />
                <PasswordInput
                    mt="md"
                    withAsterisk
                    label="Mot de passe"
                    placeholder="••••••••"
                    key={form.key('password')}
                    {...form.getInputProps('password')}
                />
                <div className={classes['reset-password-link-container']}>
                    <Link
                        className={classes['reset-password-link']}
                        to={`/reset-password?email=${encodeURIComponent(form.getValues().email)}`}
                    >
                        Mot de passe oublié ?
                    </Link>
                </div>
                <div className="form-actions">
                    <Button
                        type="submit"
                        disabled={mutation.status === 'pending'}
                        loading={mutation.status === 'pending'}
                    >
                        Connexion
                    </Button>
                </div>
            </form>
        </LayoutAuth>
    );
};

export default Component;
