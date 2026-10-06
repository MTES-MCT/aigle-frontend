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

// The videos are a path to follow in order: the number in each title says so.
const Component: React.FC<ComponentProps> = ({ onPlay, onGoToExercises }: ComponentProps) => (
    <>
        <div className={classes.intro}>
            <h2 className="fr-sr-only">Se former en vidéo</h2>
            <p>
                Découvrez les principales fonctionnalités d’AIGLE et apprenez à rechercher, consulter et suivre les
                objets détectés sur votre territoire.
            </p>
            <p>
                Nous vous conseillons de regarder les vidéos dans cet ordre, mais vous pouvez tout à fait naviguer selon
                vos besoins. Elles durent entre 1 et 5 minutes ({VIDEOS.length} vidéos,{' '}
                {formatVideoDuration(TOTAL_DURATION_SECONDS)} au total).
            </p>
            <div>
                <button
                    type="button"
                    className="fr-btn fr-btn--icon-left fr-icon-play-circle-line"
                    onClick={() => onPlay({ video: VIDEOS[0], playlist: VIDEOS })}
                >
                    Commencer par la première vidéo
                </button>
            </div>
        </div>

        <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
            {VIDEOS.map((video, index) => (
                <li key={video.id} className="fr-col-12 fr-col-md-6">
                    <div className="fr-tile fr-tile--sm fr-tile--horizontal fr-enlarge-button">
                        <div className="fr-tile__body">
                            <div className="fr-tile__content">
                                <h3 className="fr-tile__title">
                                    <button type="button" onClick={() => onPlay({ video, playlist: VIDEOS })}>
                                        {index + 1}. {video.title}
                                    </button>
                                </h3>
                                <p className="fr-tile__detail fr-icon-time-line">
                                    {formatVideoDuration(video.durationSeconds)}
                                </p>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>

        <div className={classes.next}>
            <p>Des exercices pratiques permettent ensuite de consolider vos premiers pas sur AIGLE.</p>
            <div>
                <button
                    type="button"
                    className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-todo-line"
                    onClick={onGoToExercises}
                >
                    Faire les exercices AIGLE
                </button>
            </div>
            <p className={classes.feedback}>
                N’hésitez pas à nous faire vos retours sur ces vidéos et à nous indiquer si des éléments vous manquent :
                nous pouvons être très réactifs et produire de nouvelles vidéos.
            </p>
        </div>
    </>
);

export default Component;
