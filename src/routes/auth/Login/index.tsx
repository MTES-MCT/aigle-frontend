import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { isEmail, useForm, UseFormReturnType } from '@mantine/form';
import React, { useState } from 'react';

import { authEndpoints } from '@/api/endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import WarningCard from '@/components/ui/WarningCard';
import { useAuth } from '@/store/slices/auth';
import api, { ApiError } from '@/utils/api';
import { ENVIRONMENT } from '@/utils/constants';
import { IconMail } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
}

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

const Component: React.FC = () => {
    const { setAccessToken, setRefreshToken } = useAuth();
    const [error, setError] = useState<ApiError<ErrorBody>>();
    const [mfaSentTo, setMfaSentTo] = useState<string>();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            email: '',
            password: '',
        },

        validate: {
            email: isEmail("Le format de l'adresse mail est invalide"),
        },
    });

    const mutation: UseMutationResult<LoginResponse, ApiError<ErrorBody>, FormValues> = useMutation({
        mutationFn: login,
        onSuccess: (data, variables) => {
            if (isMfaChallenge(data)) {
                setMfaSentTo(variables.email);
                return;
            }

            setAccessToken(data.access);
            setRefreshToken(data.refresh);
        },
        onError: (error) => {
            setError(error);
            if (error.body && typeof error.body === 'object') {
                form.setErrors(error.body as Record<string, string>);
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
                    setError(undefined);
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
                {error ? (
                    <ErrorCard className={classes['error-card']}>
                        {error.body?.detail ? error.body.detail : 'Identifiants invalides'}
                    </ErrorCard>
                ) : null}
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
                        to={`/reset-password?email=${form.getValues().email}`}
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
