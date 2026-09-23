import React from 'react';
import { VIDEOS } from '../content/videos';
import { formatVideoDuration } from '../utils';
import { VideoSelection } from '../VideoModal';
import classes from './index.module.scss';

const TOTAL_DURATION_SECONDS = VIDEOS.reduce((total, { durationSeconds }) => total + durationSeconds, 0);

interface ComponentProps {
    onPlay: (selection: VideoSelection) => void;
    onGoToExercises: () => void;
}

const Component: React.FC<ComponentProps> = ({ onPlay, onGoToExercises }: ComponentProps) => (
    <>
        <div className={classes.intro}>
            <h2 className="fr-sr-only">Se former en vidéo</h2>
            <p className="fr-text--lead">
                Découvrez les principales fonctionnalités d’AIGLE et apprenez à rechercher, consulter et suivre les
                objets détectés sur votre territoire.
            </p>
            <p>
                Nous vous conseillons de regarder les vidéos dans cet ordre, mais vous pouvez tout à fait naviguer selon
                vos besoins. Elles durent entre 1 et 5 minutes ({VIDEOS.length} vidéos,{' '}
                {formatVideoDuration(TOTAL_DURATION_SECONDS)} au total). Des exercices pratiques permettent ensuite de
                consolider vos premiers pas sur AIGLE.
            </p>
            <ul className="fr-btns-group fr-btns-group--inline-md fr-btns-group--icon-left">
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-icon-play-circle-line"
                        onClick={() => onPlay({ video: VIDEOS[0], playlist: VIDEOS })}
                    >
                        Commencer par la première vidéo
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-icon-todo-line"
                        onClick={onGoToExercises}
                    >
                        Faire les exercices AIGLE
                    </button>
                </li>
            </ul>
        </div>

        <ol className={classes.list}>
            {VIDEOS.map((video, index) => (
                <li key={video.id} className="fr-card fr-card--sm fr-enlarge-button">
                    <div className="fr-card__body">
                        <div className="fr-card__content">
                            <h3 className="fr-card__title">
                                <button type="button" onClick={() => onPlay({ video, playlist: VIDEOS })}>
                                    {video.title}
                                </button>
                            </h3>
                            <div className="fr-card__start">
                                <p className="fr-badge fr-badge--sm fr-badge--blue-ecume">Vidéo {index + 1}</p>
                            </div>
                            <div className="fr-card__end">
                                <p className="fr-card__detail fr-icon-play-circle-line">
                                    Regarder · {formatVideoDuration(video.durationSeconds)}
                                </p>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ol>

        <p className={classes.feedback}>
            N’hésitez pas à nous faire vos retours sur ces vidéos et à nous indiquer si des éléments vous manquent :
            nous pouvons être très réactifs et produire de nouvelles vidéos.
        </p>
    </>
);

export default Component;
