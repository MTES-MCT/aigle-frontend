import { Alert, Button, TextInput } from '@mantine/core';
import { UseFormReturnType, isEmail, useForm } from '@mantine/form';
import React, { useState } from 'react';

import { authEndpoints } from '@/api/endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import { AUTH_ERROR_MESSAGES, AUTH_ERROR_TRACKING_NAMES, getAuthErrorCause } from '@/routes/auth/errors';
import api, { ApiError } from '@/utils/api';
import { DEFAULT_ROUTE } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { IconMailCheck } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import classes from './index.module.scss';

interface SuccessProps {
    email: string;
}

const Success: React.FC<SuccessProps> = ({ email }) => {
    return (
        <LayoutAuth title="Mot de passe oublié">
            <Alert
                mt="md"
                variant="light"
                color="green"
                title="Email de réinitialisation envoyé"
                className={classes['success-card']}
                icon={<IconMailCheck />}
            >
                <p>
                    Un lien de réinitialisation de mot de passe vient d&apos;être envoyé à <b>{email}</b> si votre
                    addresse est bien associée à un compte
                </p>
            </Alert>

            <Button component={Link} to={DEFAULT_ROUTE} mt="md">
                Retour à la page d&apos;accueil
            </Button>
        </LayoutAuth>
    );
};

interface FormValues {
    email: string;
}

const resetPassword = async (user: FormValues) => {
    await api(authEndpoints.resetPassword, { method: 'POST', body: user });
};

const trackResetRequested = (name: string) =>
    trackEvent(TRACKING_CATEGORIES.account, 'Réinitialisation demandée', name);

const Component: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [errorMessage, setErrorMessage] = useState<string>();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            email: searchParams.get('email') || '',
        },
        validate: {
            email: isEmail("Le format de l'adresse mail est invalide"),
        },
    });

    const mutation: UseMutationResult<void, Error, FormValues> = useMutation({
        mutationFn: resetPassword,
        // The API answers the same whether the address has an account or not.
        onSuccess: () => trackResetRequested('Envoyée'),
        onError: (error) => {
            const cause = getAuthErrorCause(error);

            if (cause !== 'rejected') {
                trackResetRequested(AUTH_ERROR_TRACKING_NAMES[cause]);
                setErrorMessage(AUTH_ERROR_MESSAGES[cause]);
                return;
            }

            trackResetRequested('Adresse invalide');
            setErrorMessage('Adresse email invalide');
            if (error instanceof ApiError && error.body && typeof error.body === 'object') {
                form.setErrors(error.body as Record<string, string>);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    if (mutation.status === 'success') {
        return <Success email={form.getValues().email} />;
    }

    return (
        <LayoutAuth>
            <InfoCard withCloseButton={false} className={classes['info-card']}>
                <p>Entrer votre adresse email pour réinitialiser votre mot de passe</p>
                <p>Si votre addresse est associée à un compte, vous recevrez un recevoir un mail de réinitialisation</p>
            </InfoCard>

            <form className={classes.form} onSubmit={form.onSubmit(handleSubmit)}>
                {errorMessage ? <ErrorCard className={classes['error-card']}>{errorMessage}</ErrorCard> : null}
                <TextInput
                    withAsterisk
                    label="Email"
                    placeholder="jean.dupont@email.com"
                    key={form.key('email')}
                    {...form.getInputProps('email')}
                />
                <div className="form-actions">
                    <Button
                        disabled={mutation.status === 'pending'}
                        loading={mutation.status === 'pending'}
                        type="submit"
                    >
                        Réinitialiser le mot de passe
                    </Button>
                </div>
            </form>
        </LayoutAuth>
    );
};

export default Component;
