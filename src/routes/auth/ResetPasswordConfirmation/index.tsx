import { Alert, Button, PasswordInput } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { AxiosError } from 'axios';
import React, { useState } from 'react';

import { AUTH_RESET_PASSWORD_CONFIRM_ENDPOINT } from '@/api-endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import api from '@/utils/api';
import { PASSWORD_MIN_LENGTH } from '@/utils/constants';
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
    await api.post(AUTH_RESET_PASSWORD_CONFIRM_ENDPOINT, {
        newPassword: form.newPassword,
        uid,
        token,
    });
};

const Component: React.FC = () => {
    const [error, setError] = useState<AxiosError>();
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

    const mutation: UseMutationResult<void, AxiosError, FormValues> = useMutation({
        mutationFn: (form) => resetPasswordConfirm(form, String(uid), String(token)),
        onError: (error) => {
            setError(error);
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
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
                {error ? (
                    <ErrorCard className={classes['error-card']} title="Erreur lors du changement de mot de passe">
                        <p>
                            Essayez de <Link to="/reset-password">re-générer un lien de réinitialisation</Link>
                        </p>
                        <p>Si le problème persiste, contactez les administrateurs</p>
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
                    <Button type="submit">Changer le mot de passe</Button>
                </div>
            </form>
        </LayoutAuth>
    );
};

export default Component;
