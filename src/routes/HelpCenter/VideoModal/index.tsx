import { Modal } from '@mantine/core';
import React, { useRef } from 'react';
import { Video } from '../content/types';
import { formatVideoDuration } from '../utils';
import classes from './index.module.scss';

export interface VideoSelection {
    video: Video;
    // Tutorials are watched in sequence: the modal then offers the previous and next ones.
    playlist?: Video[];
}

interface ComponentProps {
    selection: VideoSelection | null;
    onSelect: (selection: VideoSelection) => void;
    onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({ selection, onSelect, onClose }: ComponentProps) => {
    const playlist = selection?.playlist ?? [];
    const index = selection ? playlist.findIndex(({ id }) => id === selection.video.id) : -1;
    const previousVideo = index > 0 ? playlist[index - 1] : undefined;
    const nextVideo = index !== -1 && index < playlist.length - 1 ? playlist[index + 1] : undefined;
    const sourceName = selection?.video.url.includes('loom.com') ? 'Loom' : 'tube.numerique.gouv.fr';
    const previousButtonRef = useRef<HTMLButtonElement>(null);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    // Reaching either end of the playlist disables the button just pressed: hand focus to the
    // other one first, or it falls to <body> and out of the modal's focus trap.
    const goTo = (video: Video, fallbackButton: HTMLButtonElement | null) => {
        const targetIndex = playlist.indexOf(video);
        if (targetIndex === 0 || targetIndex === playlist.length - 1) {
            fallbackButton?.focus();
        }
        onSelect({ video, playlist });
    };

    return (
        <Modal
            opened={!!selection}
            onClose={onClose}
            size="calc(min(100vw, 1100px) - 2rem)"
            centered
            closeButtonProps={{ 'aria-label': 'Fermer la vidéo', title: 'Fermer la vidéo' }}
            title={
                selection ? (
                    <span className={classes.title}>
                        {index !== -1 ? `${index + 1}. ` : ''}
                        {selection.video.title}
                    </span>
                ) : null
            }
        >
            {selection ? (
                <>
                    <div className={classes.player}>
                        {/* Keyed so switching videos restarts the player instead of reusing its state. */}
                        <iframe
                            key={selection.video.id}
                            src={selection.video.embedUrl}
                            title={`Vidéo : ${selection.video.title}`}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <div className={classes.footer}>
                        <p className={classes.meta}>
                            <span className="fr-icon-time-line fr-icon--sm" aria-hidden="true" />{' '}
                            {formatVideoDuration(selection.video.durationSeconds)}
                            {' · '}
                            <a
                                href={selection.video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Ouvrir sur ${sourceName} - nouvelle fenêtre`}
                            >
                                Ouvrir sur {sourceName}
                            </a>
                        </p>
                        {playlist.length > 1 ? (
                            <div className={classes.navigation}>
                                <button
                                    ref={previousButtonRef}
                                    type="button"
                                    className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
                                    disabled={!previousVideo}
                                    onClick={() => previousVideo && goTo(previousVideo, nextButtonRef.current)}
                                >
                                    Vidéo précédente
                                </button>
                                <button
                                    ref={nextButtonRef}
                                    type="button"
                                    className="fr-btn fr-btn--sm fr-btn--icon-right fr-icon-arrow-right-line"
                                    disabled={!nextVideo}
                                    onClick={() => nextVideo && goTo(nextVideo, previousButtonRef.current)}
                                >
                                    Vidéo suivante
                                </button>
                            </div>
                        ) : null}
                    </div>
                </>
            ) : null}
        </Modal>
    );
};

export default Component;
