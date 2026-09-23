import clsx from 'clsx';
import React from 'react';
import { Webinar } from '../content/types';
import { TUBE_CHANNEL_URL } from '../content/videos';
import RichText from '../RichText';
import { formatVideoDuration, formatWebinarDate, formatWebinarTimeSlot } from '../utils';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

const WebinarCard: React.FC<{ webinar: Webinar; upcoming: boolean; onPlay: (selection: VideoSelection) => void }> = ({
    webinar,
    upcoming,
    onPlay,
}) => (
    <li className={clsx(classes.webinar, upcoming && classes['webinar-upcoming'])}>
        <p className={classes.date}>
            <span className="fr-icon-calendar-event-line fr-icon--sm" aria-hidden="true" />
            {formatWebinarDate(webinar.date)}
            {webinar.timeSlot ? <span className={classes.time}>{formatWebinarTimeSlot(webinar.timeSlot)}</span> : null}
        </p>
        <h4 className={classes.title}>{webinar.title}</h4>
        {webinar.description.length ? <RichText blocks={webinar.description} /> : null}

        {upcoming ? (
            <ul className="fr-btns-group fr-btns-group--inline-md">
                {webinar.registrationUrl ? (
                    <li>
                        <a
                            className="fr-btn"
                            href={webinar.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="S’inscrire au webinaire - nouvelle fenêtre"
                        >
                            S’inscrire
                        </a>
                    </li>
                ) : null}
                {webinar.visioUrl ? (
                    <li>
                        <a
                            className="fr-btn fr-btn--secondary"
                            href={webinar.visioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Lien de connexion au webinaire - nouvelle fenêtre"
                        >
                            Lien de connexion
                        </a>
                    </li>
                ) : null}
            </ul>
        ) : (
            <ul className="fr-btns-group fr-btns-group--inline-md fr-btns-group--icon-left">
                {webinar.replay ? (
                    <li>
                        <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-icon-play-circle-line"
                            onClick={() => webinar.replay && onPlay({ video: webinar.replay })}
                        >
                            Voir le replay ({formatVideoDuration(webinar.replay.durationSeconds)})
                        </button>
                    </li>
                ) : (
                    <li>
                        <p className="fr-badge fr-badge--sm">Replay non disponible</p>
                    </li>
                )}
                {webinar.supportUrl ? (
                    <li>
                        <a
                            className="fr-btn fr-btn--tertiary fr-icon-download-line"
                            href={webinar.supportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Télécharger le support - nouvelle fenêtre"
                        >
                            Télécharger le support
                        </a>
                    </li>
                ) : null}
            </ul>
        )}
    </li>
);

interface ComponentProps {
    upcomingWebinars: Webinar[];
    pastWebinars: Webinar[];
    onPlay: (selection: VideoSelection) => void;
}

const Component: React.FC<ComponentProps> = ({ upcomingWebinars, pastWebinars, onPlay }: ComponentProps) => (
    <>
        <div className={classes.intro}>
            <h2 className="fr-sr-only">Participer à un webinaire</h2>
            <p className="fr-text--lead">
                Participez à nos webinaires pour découvrir AIGLE, ses nouvelles fonctionnalités et les retours
                d’expérience d’autres utilisateurs.
            </p>
        </div>

        <section className={classes.section}>
            <h3>Prochains webinaires</h3>
            {upcomingWebinars.length ? (
                <ul className={classes.list}>
                    {upcomingWebinars.map((webinar) => (
                        <WebinarCard key={webinar.id} webinar={webinar} upcoming onPlay={onPlay} />
                    ))}
                </ul>
            ) : (
                <p>Aucun webinaire n’est programmé pour le moment. Les prochaines dates seront annoncées ici.</p>
            )}
        </section>

        <section className={classes.section}>
            <h3>Webinaires passés</h3>
            <ul className={classes.list}>
                {pastWebinars.map((webinar) => (
                    <WebinarCard key={webinar.id} webinar={webinar} upcoming={false} onPlay={onPlay} />
                ))}
            </ul>
            <p>
                <a
                    className="fr-link"
                    href={TUBE_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Tous les replays sur la chaîne AIGLE - nouvelle fenêtre"
                >
                    Tous les replays sur la chaîne AIGLE (tube.numerique.gouv.fr)
                </a>
            </p>
        </section>
    </>
);

export default Component;
