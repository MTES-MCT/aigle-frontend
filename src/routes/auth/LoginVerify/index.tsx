import { Alert, Button, Loader } from '@mantine/core';
import React, { useState } from 'react';

import { authEndpoints } from '@/api/endpoints';
import LayoutAuth from '@/components/auth/LayoutAuth';
import ErrorCard from '@/components/ui/ErrorCard';
import { useAuth } from '@/store/slices/auth';
import api, { ApiError } from '@/utils/api';
import { IconLock } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import classes from './index.module.scss';

interface JwtAuthResponse {
    access: string;
    refresh: string;
}

const verifyLink = (token: string) =>
    api<JwtAuthResponse>(authEndpoints.mfaVerifyLink, { method: 'POST', body: { token }, auth: false });

// Un 400 signifie que le lien ne vaut plus rien, il faut en redemander un. Un 429 ou un
// 503 sont temporaires : le lien est toujours valide et l'agent doit pouvoir réessayer.
const isLinkDead = (error: ApiError) => error.status === 400 || error.status === 404;

const Component: React.FC = () => {
    const { token: tokenFromUrl } = useParams<{ token: string }>();
    const { setAccessToken, setRefreshToken } = useAuth();

    // Le jeton est encore valide au moment du rendu : le sortir de l'URL avant tout
    // évite qu'il ne parte dans l'historique du navigateur, dans Matomo ou dans Sentry.
    const [token] = useState(tokenFromUrl);
    if (tokenFromUrl) {
        window.history.replaceState(null, '', '/login/verify');
    }

    const mutation: UseMutationResult<JwtAuthResponse, ApiError, string> = useMutation({
        mutationFn: verifyLink,
        onSuccess: (data) => {
            // App.tsx sort des routes publiques dès que les jetons existent : pas de
            // navigate() à faire ici.
            setAccessToken(data.access);
            setRefreshToken(data.refresh);
        },
    });

    if (!token) {
        return (
            <LayoutAuth title="Connexion">
                <ErrorCard className={classes.card}>Ce lien de connexion est incomplet.</ErrorCard>
                <Button component={Link} to="/login" mt="md">
                    Retour à la connexion
                </Button>
            </LayoutAuth>
        );
    }

    if (mutation.error && isLinkDead(mutation.error)) {
        return (
            <LayoutAuth title="Connexion">
                <ErrorCard className={classes.card}>
                    Ce lien de connexion est invalide, a expiré ou a déjà été utilisé.
                </ErrorCard>
                <Button component={Link} to="/login" mt="md">
                    Demander un nouveau lien
                </Button>
            </LayoutAuth>
        );
    }

    return (
        <LayoutAuth title="Connexion">
            {/* Confirmation explicite plutôt qu'un échange au montage : les passerelles de
                messagerie ouvrent les liens pour les analyser, ce qui consommerait le lien
                à usage unique avant que l'agent ne clique. */}
            <Alert
                className={classes.card}
                mt="md"
                variant="light"
                color="blue"
                title="Confirmer votre connexion"
                icon={<IconLock />}
            >
                <p>Vous êtes sur le point de vous connecter à Aigle depuis cet appareil.</p>
                <p>Si vous n&apos;êtes pas à l&apos;origine de cette demande, fermez cette page.</p>
            </Alert>

            {mutation.error ? (
                <ErrorCard className={classes.card}>
                    La connexion n&apos;a pas pu aboutir pour le moment. Votre lien reste valide, réessayez dans
                    quelques instants.
                </ErrorCard>
            ) : null}

            <Button
                mt="md"
                onClick={() => mutation.mutate(token)}
                disabled={mutation.status === 'pending' || mutation.status === 'success'}
                loading={mutation.status === 'pending'}
                leftSection={mutation.status === 'success' ? <Loader size="xs" /> : null}
            >
                {mutation.status === 'success' ? 'Connexion en cours...' : 'Me connecter'}
            </Button>
        </LayoutAuth>
    );
};

export default Component;
