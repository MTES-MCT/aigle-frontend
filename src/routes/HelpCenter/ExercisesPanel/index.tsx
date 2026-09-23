import Accordion from '@/components/dsfr/Accordion';
import React from 'react';
import { EXERCISES, EXERCISES_INTRO, PATH_VALIDATION } from '../content/exercises';
import { VIDEOS } from '../content/videos';
import RichText from '../RichText';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

interface ComponentProps {
    expandedId: string | null;
    onToggle: (id: string, expanded: boolean) => void;
    onPlay: (selection: VideoSelection) => void;
}

const Component: React.FC<ComponentProps> = ({ expandedId, onToggle, onPlay }: ComponentProps) => (
    <>
        <div className={classes.intro}>
            <h2 className="fr-sr-only">Faire les exercices</h2>
            <RichText blocks={EXERCISES_INTRO} />
        </div>

        <div className="fr-accordions-group">
            {EXERCISES.map((exercise) => {
                const relatedVideos = exercise.relatedVideoIds
                    .map((videoId) => VIDEOS.find(({ id }) => id === videoId))
                    .filter((video) => video !== undefined);

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
                            <p className="fr-text--lead">{exercise.objective}</p>

                            {relatedVideos.length ? (
                                <div className={classes.videos}>
                                    <p className={classes['videos-label']}>Vidéos à regarder avant l’exercice :</p>
                                    <ul className="fr-tags-group">
                                        {relatedVideos.map((video) => (
                                            <li key={video.id}>
                                                <button
                                                    type="button"
                                                    className="fr-tag fr-tag--icon-left fr-icon-play-circle-line"
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

export default Component;
