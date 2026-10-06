import Tabs, { TabsItem } from '@/components/dsfr/Tabs';
import LayoutBase from '@/components/LayoutBase';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { isBrevoChatEnabled, openBrevoChat } from '@/utils/brevo';
import { HEADER_HEIGHT_PX } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { EXERCISES } from './content/exercises';
import { FAQ_CATEGORIES } from './content/faq';
import { WEBINARS } from './content/webinars';
import ExercisesPanel from './ExercisesPanel';
import FaqPanel from './FaqPanel';
import FicheDownloadLink from './FicheDownloadLink';
import classes from './index.module.scss';
import {
    getExerciseTrackingName,
    trackContact,
    TRACKING_CATEGORIES,
    trackVideoOpen,
    trackWebinarLink,
} from './tracking';
import {
    CONTACT_EMAIL,
    formatWebinarDate,
    formatWebinarTimeSlot,
    HELP_CENTER_TABS,
    HelpCenterTab,
    isWebinarUpcoming,
} from './utils';
import VideoModal, { VideoSelection } from './VideoModal';
import VideosPanel from './VideosPanel';
import WebinarsPanel from './WebinarsPanel';

const TABS: TabsItem<HelpCenterTab>[] = [
    { value: 'videos', label: 'Se former en vidéo', shortLabel: 'Vidéos', icon: 'fr-icon-play-circle-line' },
    { value: 'exercices', label: 'Faire les exercices', shortLabel: 'Exercices', icon: 'fr-icon-todo-line' },
    { value: 'faq', label: 'Questions fréquentes', shortLabel: 'FAQ', icon: 'fr-icon-question-line' },
    { value: 'webinaires', label: 'Webinaires', icon: 'fr-icon-calendar-event-line' },
];

const trackMailContact = () => trackContact(TRACKING_CATEGORIES.helpCenter, 'Courriel');

const isHelpCenterTab = (value: string): value is HelpCenterTab =>
    (HELP_CENTER_TABS as readonly string[]).includes(value);

// A link can point straight at an exercise or a question (`#<id>`): open it in the right tab.
const getAnchorTarget = (): { id: string; tab: HelpCenterTab; trackingName: string } | null => {
    // Ids are ASCII slugs, so no decoding: a malformed %-escape in a pasted link must not throw.
    const id = window.location.hash.slice(1);

    const exercise = EXERCISES.find((exercise) => exercise.id === id);
    if (exercise) {
        return { id, tab: 'exercices', trackingName: getExerciseTrackingName(exercise) };
    }
    const question = FAQ_CATEGORIES.flatMap(({ questions }) => questions).find((question) => question.id === id);
    if (question) {
        return { id, tab: 'faq', trackingName: question.question };
    }

    return null;
};

const Component: React.FC = () => {
    // Read once: the hash is dropped as soon as the tab is written into the url.
    const [anchorTarget] = useState(getAnchorTarget);
    const [{ onglet }, setUrlFilter] = useUrlFilter({ onglet: anchorTarget?.tab ?? 'videos' });
    const tab: HelpCenterTab = isHelpCenterTab(onglet) ? onglet : 'videos';

    const [videoSelection, setVideoSelection] = useState<VideoSelection | null>(null);
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
        anchorTarget?.tab === 'exercices' ? anchorTarget.id : null,
    );
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<string[]>(
        anchorTarget?.tab === 'faq' ? [anchorTarget.id] : [],
    );

    const upcomingWebinars = WEBINARS.filter(isWebinarUpcoming).sort((a, b) => a.date.localeCompare(b.date));
    const pastWebinars = WEBINARS.filter((webinar) => !isWebinarUpcoming(webinar)).sort((a, b) =>
        b.date.localeCompare(a.date),
    );
    const nextWebinar = upcomingWebinars[0];

    const setTab = (value: HelpCenterTab) => setUrlFilter({ onglet: value });

    const playTutorial = (selection: VideoSelection) => {
        trackVideoOpen(selection.video);
        setVideoSelection(selection);
    };

    // The tabs are not page views: without this, a visit to the help center would go unnoticed.
    // The ref absorbs the second mount effect run of StrictMode.
    const trackedTabRef = useRef<HelpCenterTab | null>(null);
    useEffect(() => {
        if (trackedTabRef.current === tab) {
            return;
        }
        trackedTabRef.current = tab;
        trackEvent(TRACKING_CATEGORIES.helpCenter, 'Onglet affiché', TABS.find(({ value }) => value === tab)?.label);
    }, [tab]);

    const anchorTrackedRef = useRef(false);
    useEffect(() => {
        if (!anchorTarget || anchorTrackedRef.current) {
            return;
        }
        anchorTrackedRef.current = true;
        trackEvent(
            anchorTarget.tab === 'faq' ? TRACKING_CATEGORIES.faq : TRACKING_CATEGORIES.exercises,
            'Lien direct ouvert',
            anchorTarget.trackingName,
        );
    }, [anchorTarget]);

    useEffect(() => {
        if (!anchorTarget) {
            return;
        }

        // Let the tab and the accordion render before measuring where the target landed.
        const timeout = setTimeout(() => {
            const element = document.getElementById(anchorTarget.id);
            if (element) {
                window.scrollTo({
                    top: element.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT_PX - 16,
                    behavior: 'smooth',
                });
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [anchorTarget]);

    return (
        <LayoutBase title="Centre d’aide">
            <div className={classes.container}>
                <div className={classes.header}>
                    <h1>Centre d’aide</h1>
                    <p className={classes.lead}>
                        Un espace pour vous accompagner dans la prise en main d’AIGLE : vidéos de formation, exercices
                        pratiques, réponses aux questions fréquentes et webinaires.
                    </p>
                    <p className={classes.download}>
                        <FicheDownloadLink />
                    </p>
                </div>

                {nextWebinar ? (
                    <section
                        className={clsx(
                            'fr-callout fr-callout--blue-ecume fr-icon-calendar-event-line',
                            classes.callout,
                            classes.webinar,
                        )}
                    >
                        <h2 className={clsx('fr-callout__title', classes['callout-title'])}>
                            Prochain webinaire : {nextWebinar.title}
                        </h2>
                        <p className="fr-callout__text">
                            {formatWebinarDate(nextWebinar.date)}
                            {nextWebinar.timeSlot ? `, ${formatWebinarTimeSlot(nextWebinar.timeSlot)}` : ''}
                        </p>
                        {nextWebinar.registrationUrl ? (
                            <a
                                className="fr-btn"
                                href={nextWebinar.registrationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="S’inscrire au webinaire - nouvelle fenêtre"
                                onClick={() => trackWebinarLink('Inscription', nextWebinar)}
                            >
                                S’inscrire
                            </a>
                        ) : nextWebinar.visioUrl ? (
                            <a
                                className="fr-btn"
                                href={nextWebinar.visioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Lien de connexion au webinaire - nouvelle fenêtre"
                                onClick={() => trackWebinarLink('Lien de connexion', nextWebinar)}
                            >
                                Lien de connexion
                            </a>
                        ) : null}
                    </section>
                ) : null}

                <div className={classes.tabs}>
                    <Tabs label="Rubriques du centre d’aide" tabs={TABS} value={tab} onChange={setTab}>
                        {tab === 'videos' ? (
                            <VideosPanel onPlay={playTutorial} onGoToExercises={() => setTab('exercices')} />
                        ) : null}
                        {tab === 'exercices' ? (
                            <ExercisesPanel
                                expandedId={expandedExerciseId}
                                onToggle={(id, expanded) => setExpandedExerciseId(expanded ? id : null)}
                                onPlay={playTutorial}
                            />
                        ) : null}
                        {tab === 'faq' ? (
                            <FaqPanel
                                expandedIds={expandedQuestionIds}
                                onToggle={(id, expanded) =>
                                    setExpandedQuestionIds((ids) =>
                                        expanded ? [...ids, id] : ids.filter((expandedId) => expandedId !== id),
                                    )
                                }
                            />
                        ) : null}
                        {tab === 'webinaires' ? (
                            <WebinarsPanel
                                upcomingWebinars={upcomingWebinars}
                                pastWebinars={pastWebinars}
                                onPlay={setVideoSelection}
                            />
                        ) : null}
                    </Tabs>
                </div>

                {/* DSFR gives a callout a single button: the chat when it is on, the address stays in the text. */}
                <section
                    className={clsx(
                        'fr-callout fr-callout--blue-ecume fr-icon-question-answer-line',
                        classes.callout,
                        classes.contact,
                    )}
                >
                    <h2 className={clsx('fr-callout__title', classes['callout-title'])}>
                        Une question non couverte par ce centre d’aide ?
                    </h2>
                    <p className="fr-callout__text">
                        Contactez l’équipe AIGLE via le tchat intégré à l’application ou par courriel à{' '}
                        <a href={`mailto:${CONTACT_EMAIL}`} onClick={trackMailContact}>
                            {CONTACT_EMAIL}
                        </a>
                        . Afin d’accélérer le traitement de votre demande, précisez votre structure, votre territoire,
                        la parcelle ou l’objet concerné, et joignez une capture d’écran lorsque c’est possible.
                    </p>
                    {isBrevoChatEnabled ? (
                        <button
                            type="button"
                            className="fr-btn fr-btn--icon-left fr-icon-chat-3-line"
                            onClick={() => {
                                trackContact(TRACKING_CATEGORIES.helpCenter, 'Tchat');
                                openBrevoChat(CONTACT_EMAIL);
                            }}
                        >
                            Ouvrir le tchat
                        </button>
                    ) : (
                        <a
                            className="fr-btn fr-btn--icon-left fr-icon-mail-line"
                            href={`mailto:${CONTACT_EMAIL}`}
                            onClick={trackMailContact}
                        >
                            Écrire à l’équipe AIGLE
                        </a>
                    )}
                </section>
            </div>

            <VideoModal selection={videoSelection} onSelect={playTutorial} onClose={() => setVideoSelection(null)} />
        </LayoutBase>
    );
};

export default Component;
