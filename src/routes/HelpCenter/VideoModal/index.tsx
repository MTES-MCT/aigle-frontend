import Modal from '@/components/dsfr/Modal';
import clsx from 'clsx';
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
    // The modal fades out after closing: keep showing what it held rather than an empty frame.
    const lastSelectionRef = useRef(selection);
    if (selection) {
        lastSelectionRef.current = selection;
    }
    const shown = selection ?? lastSelectionRef.current;

    const playlist = shown?.playlist ?? [];
    const index = shown ? playlist.findIndex(({ id }) => id === shown.video.id) : -1;
    const previousVideo = index > 0 ? playlist[index - 1] : undefined;
    const nextVideo = index !== -1 && index < playlist.length - 1 ? playlist[index + 1] : undefined;
    const sourceName = shown?.video.url.includes('loom.com') ? 'Loom' : 'tube.numerique.gouv.fr';
    const previousButtonRef = useRef<HTMLButtonElement>(null);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    // Reaching either end of the playlist disables the button just pressed: hand focus to the
    // other one first, or it falls out of the modal.
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
            closeTitle="Fermer la vidéo"
            colClassName="fr-col-12 fr-col-md-11 fr-col-lg-10"
            bodyClassName={classes.body}
            title={shown ? `${index !== -1 ? `${index + 1}. ` : ''}${shown.video.title}` : null}
            footer={
                shown ? (
                    <div className={classes.footer}>
                        <p className={classes.meta}>
                            {index !== -1 ? `Vidéo ${index + 1} sur ${playlist.length} · ` : ''}
                            <span className="fr-icon-time-line fr-icon--sm" aria-hidden="true" />
                            {formatVideoDuration(shown.video.durationSeconds)}
                            {' · '}
                            <a
                                href={shown.video.url}
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
                                    className={clsx(
                                        'fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line',
                                        classes['nav-button'],
                                    )}
                                    disabled={!previousVideo}
                                    onClick={() => previousVideo && goTo(previousVideo, nextButtonRef.current)}
                                >
                                    <span className="fr-hidden-sm">Précédente</span>
                                    <span className="fr-hidden fr-unhidden-sm">Vidéo précédente</span>
                                </button>
                                <button
                                    ref={nextButtonRef}
                                    type="button"
                                    className={clsx(
                                        'fr-btn fr-btn--sm fr-btn--icon-right fr-icon-arrow-right-line',
                                        classes['nav-button'],
                                    )}
                                    disabled={!nextVideo}
                                    onClick={() => nextVideo && goTo(nextVideo, previousButtonRef.current)}
                                >
                                    <span className="fr-hidden-sm">Suivante</span>
                                    <span className="fr-hidden fr-unhidden-sm">Vidéo suivante</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null
            }
        >
            <div className={classes.player}>
                {/* Unmounted on close so the video stops, and keyed so switching videos restarts the player. */}
                {selection ? (
                    <iframe
                        key={selection.video.id}
                        src={selection.video.embedUrl}
                        title={`Vidéo : ${selection.video.title}`}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                    />
                ) : null}
            </div>
        </Modal>
    );
};

export default Component;
