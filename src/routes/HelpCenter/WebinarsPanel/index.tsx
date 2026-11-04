import { Webinar } from '@/models/help-center';
import { trackEvent } from '@/utils/matomo';
import clsx from 'clsx';
import React from 'react';
import { getPlayableVideo, TUBE_CHANNEL_URL } from '../content/videos';
import { RichHtml } from '../RichText';
import { TRACKING_CATEGORIES, trackWebinarLink } from '../tracking';
import { formatWebinarSchedule, formatWebinarTimeSlot } from '../utils';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

interface WebinarCardProps {
    webinar: Webinar;
    upcoming: boolean;
    onPlay: (selection: VideoSelection) => void;
}

const WebinarCard: React.FC<WebinarCardProps> = ({ webinar, upcoming, onPlay }: WebinarCardProps) => {
    const replayVideo = webinar.replayUrl ? getPlayableVideo(webinar.replayUrl, webinar.title) : null;
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
    ) : webinar.replayUrl ? (
        <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline-md fr-btns-group--icon-left">
            <li>
                {replayVideo ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-icon-play-circle-line"
                        onClick={() => {
                            trackWebinarLink('Replay', webinar);
                            onPlay({ video: replayVideo });
                        }}
                    >
                        Voir le replay
                    </button>
                ) : (
                    <a
                        className="fr-btn fr-btn--secondary fr-icon-play-circle-line"
                        href={webinar.replayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Voir le replay - nouvelle fenêtre"
                        onClick={() => trackWebinarLink('Replay', webinar)}
                    >
                        Voir le replay
                    </a>
                )}
            </li>
        </ul>
    ) : null;

    return (
        <li className="fr-col-12">
            <div className={clsx('fr-card', !upcoming && 'fr-card--sm')}>
                <div className="fr-card__body">
                    <div className="fr-card__content">
                        <h4 className="fr-card__title">{webinar.title}</h4>
                        {webinar.description ? (
                            <div className="fr-card__desc">
                                <RichHtml html={webinar.description} />
                            </div>
                        ) : null}
                        <div className="fr-card__start">
                            {!upcoming && !webinar.replayUrl ? (
                                <ul className="fr-badges-group">
                                    <li>
                                        <p className="fr-badge fr-badge--sm">Replay non disponible</p>
                                    </li>
                                </ul>
                            ) : null}
                            <p className="fr-card__detail fr-icon-calendar-event-line">
                                {formatWebinarSchedule(webinar, ' · ')}
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
    inProgressWebinar?: Webinar;
    isLoading: boolean;
    isError: boolean;
    onPlay: (selection: VideoSelection) => void;
}

const Component: React.FC<ComponentProps> = ({
    upcomingWebinars,
    pastWebinars,
    inProgressWebinar,
    isLoading,
    isError,
    onPlay,
}: ComponentProps) => (
    <>
        {inProgressWebinar ? (
            <div className={clsx('fr-notice fr-notice--info', classes.live)}>
                <div className={clsx('fr-notice__body', classes['live-body'])}>
                    <p>
                        <span className="fr-notice__title">Webinaire en cours : {inProgressWebinar.title}</span>
                        {inProgressWebinar.startTime && inProgressWebinar.endTime ? (
                            <span className="fr-notice__desc">
                                {formatWebinarTimeSlot(inProgressWebinar.startTime, inProgressWebinar.endTime)}
                            </span>
                        ) : null}
                    </p>
                    {inProgressWebinar.visioUrl ? (
                        <a
                            className="fr-btn fr-btn--icon-left fr-icon-live-line"
                            href={inProgressWebinar.visioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Rejoindre la visio - nouvelle fenêtre"
                            onClick={() => trackWebinarLink('Lien de connexion', inProgressWebinar)}
                        >
                            Rejoindre la visio
                        </a>
                    ) : null}
                </div>
            </div>
        ) : null}

        <div className={classes.intro}>
            <h2 className="fr-sr-only">Participer à un webinaire</h2>
            <p>
                Participez à nos webinaires pour découvrir AIGLE, ses nouvelles fonctionnalités et les retours
                d’expérience d’autres utilisateurs.
            </p>
        </div>

        {isError ? (
            <div className="fr-alert fr-alert--error fr-alert--sm">
                <p>Les webinaires n’ont pas pu être chargés. Réessayez dans quelques instants.</p>
            </div>
        ) : isLoading ? (
            <p className={classes.empty}>Chargement des webinaires…</p>
        ) : (
            <>
                <section className={classes.section}>
                    <h3 className="fr-h6">Prochains webinaires</h3>
                    {upcomingWebinars.length ? (
                        <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
                            {upcomingWebinars.map((webinar) => (
                                <WebinarCard key={webinar.uuid} webinar={webinar} upcoming onPlay={onPlay} />
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
                            <WebinarCard key={webinar.uuid} webinar={webinar} upcoming={false} onPlay={onPlay} />
                        ))}
                    </ul>
                </section>
            </>
        )}
    </>
);

export default Component;
