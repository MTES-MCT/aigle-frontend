import { trackEvent } from '@/utils/matomo';
import clsx from 'clsx';
import React from 'react';
import { Webinar } from '../content/types';
import { TUBE_CHANNEL_URL } from '../content/videos';
import RichText from '../RichText';
import { TRACKING_CATEGORIES, trackWebinarLink } from '../tracking';
import { formatVideoDuration, formatWebinarDate, formatWebinarTimeSlot } from '../utils';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

interface WebinarCardProps {
    webinar: Webinar;
    upcoming: boolean;
    onPlay: (selection: VideoSelection) => void;
}

const WebinarCard: React.FC<WebinarCardProps> = ({ webinar, upcoming, onPlay }: WebinarCardProps) => {
    const actions = upcoming ? (
        <ul className="fr-btns-group fr-btns-group--inline-md">
            {webinar.registrationUrl ? (
                <li>
                    <a
                        className="fr-btn"
                        href={webinar.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="S’inscrire au webinaire - nouvelle fenêtre"
                        onClick={() => trackWebinarLink('Inscription', webinar)}
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
                        onClick={() => trackWebinarLink('Lien de connexion', webinar)}
                    >
                        Lien de connexion
                    </a>
                </li>
            ) : null}
        </ul>
    ) : webinar.replay || webinar.supportUrl ? (
        <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline-md fr-btns-group--icon-left">
            {webinar.replay ? (
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-icon-play-circle-line"
                        onClick={() => {
                            if (webinar.replay) {
                                trackWebinarLink('Replay', webinar);
                                onPlay({ video: webinar.replay });
                            }
                        }}
                    >
                        Voir le replay ({formatVideoDuration(webinar.replay.durationSeconds)})
                    </button>
                </li>
            ) : null}
            {webinar.supportUrl ? (
                <li>
                    <a
                        className="fr-btn fr-btn--tertiary fr-icon-download-line"
                        href={webinar.supportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Télécharger le support - nouvelle fenêtre"
                        onClick={() => trackWebinarLink('Support', webinar)}
                    >
                        Télécharger le support
                    </a>
                </li>
            ) : null}
        </ul>
    ) : null;

    return (
        <li className="fr-col-12">
            <div className={clsx('fr-card', !upcoming && 'fr-card--sm')}>
                <div className="fr-card__body">
                    <div className="fr-card__content">
                        <h4 className="fr-card__title">{webinar.title}</h4>
                        {webinar.description.length ? (
                            <div className="fr-card__desc">
                                <RichText blocks={webinar.description} />
                            </div>
                        ) : null}
                        <div className="fr-card__start">
                            {!upcoming && !webinar.replay ? (
                                <ul className="fr-badges-group">
                                    <li>
                                        <p className="fr-badge fr-badge--sm">Replay non disponible</p>
                                    </li>
                                </ul>
                            ) : null}
                            <p className="fr-card__detail fr-icon-calendar-event-line">
                                {formatWebinarDate(webinar.date)}
                                {webinar.timeSlot ? ` · ${formatWebinarTimeSlot(webinar.timeSlot)}` : ''}
                            </p>
                        </div>
                    </div>
                    {actions ? <div className="fr-card__footer">{actions}</div> : null}
                </div>
            </div>
        </li>
    );
};

interface ComponentProps {
    upcomingWebinars: Webinar[];
    pastWebinars: Webinar[];
    onPlay: (selection: VideoSelection) => void;
}

const Component: React.FC<ComponentProps> = ({ upcomingWebinars, pastWebinars, onPlay }: ComponentProps) => (
    <>
        <div className={classes.intro}>
            <h2 className="fr-sr-only">Participer à un webinaire</h2>
            <p>
                Participez à nos webinaires pour découvrir AIGLE, ses nouvelles fonctionnalités et les retours
                d’expérience d’autres utilisateurs.
            </p>
        </div>

        <section className={classes.section}>
            <h3 className="fr-h6">Prochains webinaires</h3>
            {upcomingWebinars.length ? (
                <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
                    {upcomingWebinars.map((webinar) => (
                        <WebinarCard key={webinar.id} webinar={webinar} upcoming onPlay={onPlay} />
                    ))}
                </ul>
            ) : (
                <p className={classes.empty}>
                    Aucun webinaire n’est programmé pour le moment. Les prochaines dates seront annoncées ici.
                </p>
            )}
        </section>

        <section className={classes.section}>
            <div className={classes['section-heading']}>
                <h3 className="fr-h6">Webinaires passés</h3>
                <a
                    className="fr-link fr-link--sm"
                    href={TUBE_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Tous les replays sur la chaîne AIGLE (tube.numerique.gouv.fr) - nouvelle fenêtre"
                    onClick={() => trackEvent(TRACKING_CATEGORIES.webinars, 'Chaîne des replays')}
                >
                    Tous les replays sur la chaîne AIGLE
                </a>
            </div>
            <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
                {pastWebinars.map((webinar) => (
                    <WebinarCard key={webinar.id} webinar={webinar} upcoming={false} onPlay={onPlay} />
                ))}
            </ul>
        </section>
    </>
);

export default Component;
