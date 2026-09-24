import Accordion from '@/components/dsfr/Accordion';
import { HEADER_HEIGHT_PX } from '@/utils/constants';
import React from 'react';
import { EXERCISES, EXERCISES_INTRO, PATH_VALIDATION } from '../content/exercises';
import { VIDEOS } from '../content/videos';
import RichText from '../RichText';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

// Matches the Collapse transition, after which the next exercise has reached its final position.
const COLLAPSE_TRANSITION_MS = 300;

interface ComponentProps {
    expandedId: string | null;
    onToggle: (id: string, expanded: boolean) => void;
    onPlay: (selection: VideoSelection) => void;
}

const Component: React.FC<ComponentProps> = ({ expandedId, onToggle, onPlay }: ComponentProps) => {
    // Opening the next exercise closes the current one above it: scroll once the layout has settled.
    const openExercise = (id: string) => {
        onToggle(id, true);
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                // The button that was pressed is now inside a collapsed panel: move focus with the reader.
                element.querySelector<HTMLButtonElement>('.fr-accordion__btn')?.focus({ preventScroll: true });
                window.scrollTo({
                    top: element.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT_PX - 16,
                    behavior: 'smooth',
                });
            }
        }, COLLAPSE_TRANSITION_MS);
    };

    return (
        <>
            <div className={classes.intro}>
                <h2 className="fr-sr-only">Faire les exercices</h2>
                <RichText blocks={EXERCISES_INTRO} />
            </div>

            <div className="fr-accordions-group">
                {EXERCISES.map((exercise, index) => {
                    const relatedVideos = exercise.relatedVideoIds
                        .map((videoId) => VIDEOS.find(({ id }) => id === videoId))
                        .filter((video) => video !== undefined);
                    const nextExercise = EXERCISES[index + 1];

                    return (
                        <Accordion
                            key={exercise.id}
                            id={exercise.id}
                            title={
                                <span className={classes.title}>
                                    <span className={classes.label}>{exercise.label}</span>
                                    <span>{exercise.title}</span>
                                </span>
                            }
                            expanded={expandedId === exercise.id}
                            onToggle={(expanded) => onToggle(exercise.id, expanded)}
                        >
                            <div className={classes.exercise}>
                                <p className={classes.objective}>{exercise.objective}</p>

                                {relatedVideos.length ? (
                                    <div className={classes.videos}>
                                        <p className={classes['videos-label']}>Vidéos à regarder avant l’exercice :</p>
                                        <ul className="fr-tags-group">
                                            {relatedVideos.map((video) => (
                                                <li key={video.id}>
                                                    <button
                                                        type="button"
                                                        className={`fr-tag fr-tag--icon-left fr-icon-play-circle-line ${classes.tag}`}
                                                        onClick={() => onPlay({ video, playlist: VIDEOS })}
                                                    >
                                                        {VIDEOS.indexOf(video) + 1}. {video.title}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {exercise.sections.map((section) => (
                                    <section key={section.title} className={classes.section}>
                                        <h4>{section.title}</h4>
                                        <RichText blocks={section.blocks} />
                                    </section>
                                ))}

                                {nextExercise ? (
                                    <div className={classes.next}>
                                        <button
                                            type="button"
                                            className="fr-btn fr-btn--tertiary fr-btn--sm fr-btn--icon-right fr-icon-arrow-down-line"
                                            onClick={() => openExercise(nextExercise.id)}
                                        >
                                            {nextExercise.label} : {nextExercise.title}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </Accordion>
                    );
                })}
            </div>

            <section className={classes.validation}>
                <h3>Validation du parcours</h3>
                <RichText blocks={PATH_VALIDATION} />
            </section>
        </>
    );
};

export default Component;
