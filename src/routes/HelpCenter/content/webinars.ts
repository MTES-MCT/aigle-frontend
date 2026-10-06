import { Webinar } from './types';
import { tubeVideo } from './videos';

// Upcoming and past are split at render time, so a webinar moves to the replay list on its own
// once it is over: add new sessions here and attach the replay when it is published.
export const WEBINARS: Webinar[] = [
    {
        id: 'plan-de-controle-2026-10-13',
        title: 'Comment construire et suivre un plan de contrôle sur AIGLE ?',
        date: '2026-10-13',
        timeSlot: { start: '14:30', end: '15:30' },
        description: [
            {
                type: 'paragraph',
                text: 'Webinaire thématique : des utilisateurs d’AIGLE partagent, sous un format de 10 à 15 minutes, leur retour d’expérience sur la manière dont AIGLE les aide à définir et suivre un plan de contrôle.',
            },
        ],
        registrationUrl: 'https://ring-april-4ec.notion.site/3a42f7d5d5478087bf99e6ea82767e11',
        visioUrl: 'https://visio.numerique.gouv.fr/oad-rdxs-tzi',
    },
    {
        id: 'nouveautes-2026-09-22',
        title: 'Webinaire produit : les nouveautés d’AIGLE',
        date: '2026-09-22',
        timeSlot: { start: '14:30', end: '15:30' },
        description: [
            { type: 'paragraph', text: 'Découvrez les dernières évolutions d’AIGLE :' },
            {
                type: 'list',
                items: [
                    'l’interconnexion entre AIGLE et LUCCA, qui automatise la mise à jour des dossiers et évite les doubles saisies ;',
                    'les nouveaux tableaux de bord permettant aux DDT(M) et aux collectivités de suivre le déploiement, l’activité et les usages sur leur territoire ;',
                    'les filtres rapides adaptés aux principaux besoins métier : vérification des détections, préparation des visites, gestion des contrôles et des procédures, suivi des courriers et des remises en état ;',
                    'un aperçu de la future interface d’AIGLE, progressivement mise en conformité avec le design system de l’État.',
                ],
            },
        ],
        replay: tubeVideo('sg9HpNz4jwg1Gv9szVjQ5n', 'Webinaire produit : les nouveautés d’AIGLE', 2765),
    },
    {
        id: 'terrain-2026-06-18',
        title: 'Webinaire « Utiliser AIGLE sur le terrain »',
        date: '2026-06-18',
        description: [
            {
                type: 'paragraph',
                text: 'À travers les témoignages de deux utilisateurs, issus de la DDTM et d’une commune rurale, ce webinaire présente des pratiques concrètes pour cibler les contrôles, organiser les déplacements, suivre les détections sur téléphone ou tablette et favoriser la régularisation ou la remise en état des parcelles.',
            },
        ],
        replay: tubeVideo('pb3BaDvYGbAP3b9zUZghZ3', 'Webinaire « Utiliser AIGLE sur le terrain »', 3692),
    },
    {
        id: 'produit-2026-06-04',
        title: 'Webinaire produit AIGLE',
        date: '2026-06-04',
        description: [],
    },
];
