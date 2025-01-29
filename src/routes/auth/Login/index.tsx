import { Button, PasswordInput, TextInput } from '@mantine/core';
import { isEmail, useForm, UseFormReturnType } from '@mantine/form';
import { AxiosError } from 'axios';
import React, { useState } from 'react';

import { AUTH_LOGIN_ENDPOINT } from '@/api-endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import WarningCard from '@/components/ui/WarningCard';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth-context';
import { ENVIRONMENT } from '@/utils/constants';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

interface JwtAuthResponse {
    access: string;
    refresh: string;
}

interface FormValues {
    email: string;
    password: string;
}

const login = async (user: FormValues) => {
    const response = await api.post<JwtAuthResponse>(AUTH_LOGIN_ENDPOINT, user);
    return response.data;
};

const Component: React.FC = () => {
    const { setAccessToken, setRefreshToken } = useAuth();
    const [error, setError] = useState<AxiosError>();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            email: '',
            password: '',
        },

        validate: {
            email: isEmail("Le format de l'adresse mail est invalide"),
        },
    });

    const mutation: UseMutationResult<JwtAuthResponse, AxiosError, FormValues> = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            setAccessToken(data.access);
            setRefreshToken(data.refresh);
        },
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
                {error ? <ErrorCard className={classes['error-card']}>Identifiants invalides</ErrorCard> : null}
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
                    <Button type="submit" disabled={mutation.status === 'pending'}>
                        Connexion
                    </Button>
                </div>
            </form>
        </LayoutAuth>
    );
};

export default Component;
