import pdfDoc from '@/assets/Fiche métier - AIGLE - v2.3.pdf';
import { triggerDownload } from '@/utils/download';
import { trackEvent } from '@/utils/matomo';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { TRACKING_CATEGORIES } from '../tracking';
import classes from './index.module.scss';

const FILE_NAME = 'Fiche métier - AIGLE - v2.3.pdf';
const FILE_DETAIL = 'PDF – 3,3 Mo';
const DONE_MESSAGE_DURATION_MS = 5000;

type DownloadStatus =
    | { state: 'idle' }
    | { state: 'loading'; percent: number | null }
    | { state: 'done' }
    | { state: 'error' };

const ANNOUNCEMENTS: Record<DownloadStatus['state'], string> = {
    idle: '',
    loading: 'Téléchargement de la fiche métier en cours',
    done: 'Fiche métier téléchargée',
    error: 'Le téléchargement de la fiche métier a échoué, réessayez',
};

const trackDownload = () => trackEvent(TRACKING_CATEGORIES.helpCenter, 'Fiche métier téléchargée', FILE_NAME);

const fetchWithProgress = async (
    url: string,
    signal: AbortSignal,
    onProgress: (percent: number) => void,
): Promise<Blob> => {
    const response = await fetch(url, { signal });

    if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
    }

    // A compressed response announces its compressed size, against which the progress would overshoot.
    const total = response.headers.has('Content-Encoding') ? 0 : Number(response.headers.get('Content-Length'));
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        // Typed as possibly shared memory, which a Blob refuses; a fetch body never is.
        chunks.push(value as Uint8Array<ArrayBuffer>);
        received += value.length;
        if (total) {
            onProgress(Math.min(99, Math.floor((received / total) * 100)));
        }
    }

    return new Blob(chunks, { type: 'application/pdf' });
};

/**
 * DSFR download link that fetches the file itself instead of leaving it to the browser, whose
 * only sign of a 3 Mo download on a slow connection is its own download bar, easy to miss.
 * The progress and the outcome take the place of the file details under the link.
 */
const Component: React.FC = () => {
    const [status, setStatus] = useState<DownloadStatus>({ state: 'idle' });
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortControllerRef.current?.abort(), []);

    useEffect(() => {
        if (status.state !== 'done') {
            return;
        }

        const timeout = setTimeout(() => setStatus({ state: 'idle' }), DONE_MESSAGE_DURATION_MS);
        return () => clearTimeout(timeout);
    }, [status.state]);

    const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        // A modified click (new tab, new window, save as) keeps the browser's own behaviour.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            trackDownload();
            return;
        }

        event.preventDefault();

        if (status.state === 'loading') {
            return;
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        setStatus({ state: 'loading', percent: null });

        try {
            const blob = await fetchWithProgress(pdfDoc, abortController.signal, (percent) =>
                setStatus((previous) =>
                    previous.state === 'loading' && previous.percent === percent
                        ? previous
                        : { state: 'loading', percent },
                ),
            );
            triggerDownload(blob, FILE_NAME);
            trackDownload();
            setStatus({ state: 'done' });
        } catch {
            if (!abortController.signal.aborted) {
                setStatus({ state: 'error' });
            }
        }
    };

    const statusLabel =
        status.state === 'loading'
            ? `Téléchargement en cours…${status.percent === null ? '' : ` ${status.percent} %`}`
            : status.state === 'done'
              ? 'Téléchargement terminé'
              : 'Échec du téléchargement, réessayez';

    return (
        <>
            <a
                className={clsx('fr-link fr-link--download', classes.link)}
                href={pdfDoc}
                download={FILE_NAME}
                aria-busy={status.state === 'loading' || undefined}
                onClick={handleClick}
            >
                Télécharger la fiche métier AIGLE
                <span
                    className={clsx(
                        'fr-link__detail',
                        status.state === 'done' && classes.done,
                        status.state === 'error' && classes.error,
                    )}
                >
                    {status.state === 'idle' ? (
                        FILE_DETAIL
                    ) : (
                        <>
                            {/* Announced once by the status region below, not on every percent. */}
                            <span
                                className={clsx(
                                    status.state === 'done' && 'fr-icon-check-line fr-icon--xs',
                                    status.state === 'error' && 'fr-icon-error-warning-line fr-icon--xs',
                                    classes.status,
                                )}
                                aria-hidden="true"
                            >
                                {statusLabel}
                            </span>
                            <span className="fr-sr-only">{FILE_DETAIL}</span>
                        </>
                    )}
                </span>
            </a>
            <span className="fr-sr-only" role="status">
                {ANNOUNCEMENTS[status.state]}
            </span>
        </>
    );
};

export default Component;
