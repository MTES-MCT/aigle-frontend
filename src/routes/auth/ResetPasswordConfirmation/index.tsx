import { Alert, Button, PasswordInput } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import React, { useState } from 'react';

import { authEndpoints } from '@/api/endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import { AUTH_ERROR_MESSAGES, AUTH_ERROR_TRACKING_NAMES, getAuthErrorCause } from '@/routes/auth/errors';
import api, { ApiError } from '@/utils/api';
import { PASSWORD_MIN_LENGTH } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { IconCheck } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import classes from './index.module.scss';

const Success: React.FC = () => {
    return (
        <LayoutAuth title="Mot de passe oublié - succès">
            <Alert
                className={classes['success-card']}
                mt="md"
                variant="light"
                color="green"
                title="Mot de passe réinitialisé"
                icon={<IconCheck />}
            >
                <p>Votre mot de passe a été réinitialisé avec succès !</p>
                <p>Vous pouvez désormais vous connecter avec votre nouveau mot de passe</p>
            </Alert>
            <Button component={Link} to="/login" mt="md">
                Page de connexion
            </Button>
        </LayoutAuth>
    );
};

interface FormValues {
    newPassword: string;
    newPasswordConfirm: string;
}

const resetPasswordConfirm = async (form: FormValues, uid: string, token: string) => {
    await api(authEndpoints.resetPasswordConfirm, {
        method: 'POST',
        body: {
            newPassword: form.newPassword,
            uid,
            token,
        },
    });
};

const trackResetConfirmed = (name: string) =>
    trackEvent(TRACKING_CATEGORIES.account, 'Nouveau mot de passe soumis', name);

// The password validators answer on newPassword; anything else rejected is the uid or the token.
const isPasswordRejected = (error: unknown) =>
    error instanceof ApiError && !!error.body && typeof error.body === 'object' && 'newPassword' in error.body;

type ResetConfirmError = { kind: 'link' } | { kind: 'password' } | { kind: 'other'; message: string };

const Component: React.FC = () => {
    const [error, setError] = useState<ResetConfirmError>();
    const { uid, token } = useParams<{ uid: string; token: string }>();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            newPassword: '',
            newPasswordConfirm: '',
        },

        validate: {
            newPassword: (value) => {
                if (value.length < PASSWORD_MIN_LENGTH) {
                    return `Le mot de passe doit faire minimum ${PASSWORD_MIN_LENGTH} caractères`;
                }

                return null;
            },
            newPasswordConfirm: (value, values) => {
                if (value === values.newPassword) {
                    return null;
                }

                return 'Les deux mots de passe doivent être identiques';
            },
        },
    });

    const mutation: UseMutationResult<void, Error, FormValues> = useMutation({
        mutationFn: (form) => resetPasswordConfirm(form, String(uid), String(token)),
        onSuccess: () => trackResetConfirmed('Accepté'),
        onError: (error) => {
            const cause = getAuthErrorCause(error);

            if (cause !== 'rejected') {
                trackResetConfirmed(AUTH_ERROR_TRACKING_NAMES[cause]);
                setError({ kind: 'other', message: AUTH_ERROR_MESSAGES[cause] });
                return;
            }

            if (isPasswordRejected(error)) {
                trackResetConfirmed('Mot de passe refusé');
                setError({ kind: 'password' });
            } else {
                trackResetConfirmed('Lien invalide ou expiré');
                setError({ kind: 'link' });
            }

            if (error instanceof ApiError && error.body && typeof error.body === 'object') {
                form.setErrors(error.body as Record<string, string>);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    if (mutation.status === 'success') {
        return <Success />;
    }

    return (
        <LayoutAuth>
            <form className={classes.form} onSubmit={form.onSubmit(handleSubmit)}>
                {error?.kind === 'link' ? (
                    <ErrorCard className={classes['error-card']} title="Lien de réinitialisation invalide ou expiré">
                        <p>
                            Essayez de <Link to="/reset-password">re-générer un lien de réinitialisation</Link>
                        </p>
                        <p>Si le problème persiste, contactez les administrateurs</p>
                    </ErrorCard>
                ) : null}
                {error?.kind === 'password' ? (
                    <ErrorCard className={classes['error-card']} title="Mot de passe refusé">
                        <p>Choisissez un autre mot de passe : la raison du refus est indiquée sous le champ.</p>
                    </ErrorCard>
                ) : null}
                {error?.kind === 'other' ? (
                    <ErrorCard className={classes['error-card']} title="Erreur lors du changement de mot de passe">
                        <p>{error.message}</p>
                    </ErrorCard>
                ) : null}
                <PasswordInput
                    mt="md"
                    withAsterisk
                    label="Mot de passe"
                    placeholder="••••••••"
                    key={form.key('newPassword')}
                    {...form.getInputProps('newPassword')}
                />
                <PasswordInput
                    mt="md"
                    withAsterisk
                    label="Confirmation de mot de passe"
                    placeholder="••••••••"
                    key={form.key('newPasswordConfirm')}
                    {...form.getInputProps('newPasswordConfirm')}
                />
                <div className="form-actions">
                    <Button type="submit" disabled={mutation.isPending} loading={mutation.isPending}>
                        Changer le mot de passe
                    </Button>
                </div>
            </form>
        </LayoutAuth>
    );
};

export default Component;
