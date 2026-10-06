import LayoutBase from '@/components/LayoutBase';
import { trackEventOnce } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import classes from './index.module.scss';

const TRACKED_SEGMENT = /^[a-z-]{1,40}$/;

// The first one or two segments of the dead path ('help-center'): never an id, a token or an email.
const getNotFoundTrackingName = (pathname: string): string => {
    const segments: string[] = [];

    for (const segment of pathname.toLowerCase().split('/').filter(Boolean).slice(0, 2)) {
        if (!TRACKED_SEGMENT.test(segment)) {
            break;
        }
        segments.push(segment);
    }

    return segments.length ? segments.join('/') : 'autre';
};

const Component: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        trackEventOnce(TRACKING_CATEGORIES.navigation, 'Page introuvable ouverte', getNotFoundTrackingName(pathname));
    }, [pathname]);

    return (
        <LayoutBase title="Page non trouvée">
            <div className={classes.container}>
                <p className="fr-text--sm fr-mb-2w">Erreur 404</p>
                <h1>Page non trouvée</h1>
                <p className="fr-text--lead">La page que vous cherchez est introuvable.</p>
                <p>
                    Si vous avez saisi l’adresse dans le navigateur, vérifiez qu’elle est correcte. Si vous avez suivi
                    un lien, la page a peut-être été déplacée ou supprimée.
                </p>
                {/* Full loads: from the admin section, the rest of the app needs a fresh start. */}
                <ul className="fr-btns-group fr-btns-group--inline-md">
                    <li>
                        <a className="fr-btn" href="/map">
                            Aller à la carte
                        </a>
                    </li>
                    <li>
                        <a className="fr-btn fr-btn--secondary" href="/help">
                            Consulter le centre d’aide
                        </a>
                    </li>
                </ul>
            </div>
        </LayoutBase>
    );
};

export default Component;
