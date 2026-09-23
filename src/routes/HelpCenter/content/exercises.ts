import { OBJECTS_FILTER_PRESETS } from '@/utils/objects-filter-presets';
import { AppFilterLink, ContentBlock, Exercise } from './types';
import { VIDEO_IDS } from './videos';

const presetLink = (label: string, path: AppFilterLink['path'], presetId: string): ContentBlock => {
    const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === presetId);

    if (!preset) {
        throw new Error(`Unknown objects filter preset: ${presetId}`);
    }

    return { type: 'appLink', label, path, filter: preset.filter };
};

const AUTO_SAVE_NOTE: ContentBlock = {
    type: 'note',
    text: 'Il n’y a pas de bouton d’enregistrement : le statut est enregistré dès que vous le sélectionnez, et le commentaire quelques instants après la saisie.',
};

const actionsChecklist = (id: string, status: string): ContentBlock => ({
    type: 'checklist',
    id,
    items: Array.from({ length: 7 }, (_, index) => `Objet ${index + 1} passé en **${status}**`),
    summary: '**Nombre minimal d’actions opérationnelles : 7**',
});

export const EXERCISES_INTRO: ContentBlock[] = [
    { type: 'paragraph', text: 'À l’issue de ces exercices, vous saurez :' },
    {
        type: 'list',
        items: [
            'rechercher et filtrer des objets ;',
            'consulter une fiche objet ;',
            'préparer un contrôle ;',
            'mettre à jour le statut de contrôle ;',
            'ajouter un commentaire de suivi ;',
            'télécharger une fiche de signalement ;',
            'retrouver les objets selon l’avancement de leur traitement.',
        ],
    },
    {
        type: 'paragraph',
        text: 'Regardez les vidéos associées à chaque exercice, puis faites l’exercice en suivant pour consolider. Pour les besoins de ces exercices, **une action opérationnelle correspond à une modification enregistrée du statut de contrôle d’un objet**.',
    },
    {
        type: 'warning',
        text: 'Réalisez les exercices sur un environnement de démonstration ou sur des objets dont le statut correspond à une action réellement menée. Ne modifiez pas fictivement le statut d’un dossier réel.',
    },
];

export const EXERCISES: Exercise[] = [
    {
        id: 'journee-de-controle',
        label: 'Exercice 1',
        title: 'Mettre à jour les objets après une journée de contrôle',
        objective:
            'Apprendre à retrouver des objets préparés pour un contrôle et à enregistrer les résultats d’une opération de terrain.',
        relatedVideoIds: [
            VIDEO_IDS.TABLE,
            VIDEO_IDS.DETECTED_OBJECTS,
            VIDEO_IDS.HISTORY,
            VIDEO_IDS.STATUSES,
            VIDEO_IDS.CONTROL_STATUSES,
        ],
        sections: [
            {
                title: 'Situation',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Votre équipe vient de réaliser une journée de contrôle. Sept objets ont été vus sur le terrain. Vous devez mettre à jour chaque objet dans AIGLE afin que le tableau de suivi reflète les contrôles réalisés.',
                    },
                ],
            },
            {
                title: '1. Retrouver les objets à contrôler',
                blocks: [
                    {
                        type: 'list',
                        items: [
                            'Ouvrez l’onglet **Tableau**.',
                            'Sélectionnez la commune concernée.',
                            'Appliquez le filtre de validation **Suspect**.',
                            'Appliquez le statut de contrôle **Non contrôlé**.',
                            'Repérez sept objets à utiliser pour l’exercice.',
                        ],
                    },
                    {
                        type: 'note',
                        text: '**Astuce** : les **filtres rapides** cochent automatiquement les cases des statuts de validation et de contrôle, et règlent l’affichage des objets prescrits. Par exemple, le filtre rapide **Préparer des visites** affiche en un clic les objets suspects non contrôlés, et **Gérer les contrôles terrain** les objets à contrôler.',
                    },
                    presetLink('Ouvrir le Tableau avec le filtre « Préparer des visites »', '/table', 'PREPARE_VISITS'),
                ],
            },
            {
                title: '2. Consulter le premier objet',
                blocks: [
                    {
                        type: 'list',
                        items: [
                            'Dépliez la ligne d’une parcelle, puis cliquez sur le numéro de l’objet pour l’ouvrir sur la carte.',
                            'Consultez sa fiche.',
                            'Vérifiez la parcelle, le type d’objet et les différents millésimes disponibles.',
                            'Téléchargez sa fiche de signalement.',
                        ],
                    },
                    {
                        type: 'warning',
                        text: 'Pour la fiche de signalement, utilisez les boutons **Fiches de signalement** (« A l’objet » ou « A la parcelle »). Le bouton **Courrier préalable à la parcelle** génère un courrier et passe l’objet au statut **Courrier préalable envoyé** : ne l’utilisez pas dans cet exercice.',
                    },
                ],
            },
            {
                title: '3. Enregistrer les sept contrôles',
                blocks: [
                    { type: 'paragraph', text: 'Pour chacun des sept objets :' },
                    {
                        type: 'list',
                        items: [
                            'ouvrez la fiche objet ;',
                            'sélectionnez le statut de contrôle **Contrôlé terrain** ;',
                            'ajoutez un commentaire court, par exemple :',
                        ],
                    },
                    { type: 'example', text: 'Contrôle terrain réalisé le [date] – situation à analyser.' },
                    AUTO_SAVE_NOTE,
                ],
            },
            {
                title: 'Compteur d’actions',
                blocks: [actionsChecklist('journee-de-controle', 'Contrôlé terrain')],
            },
            {
                title: 'Vérification finale',
                blocks: [
                    { type: 'paragraph', text: 'Retournez dans l’onglet **Tableau** et appliquez les filtres :' },
                    {
                        type: 'list',
                        items: [
                            'statut de validation : **Suspect** ;',
                            'statut de contrôle : **Contrôlé terrain** ;',
                            'commune concernée.',
                        ],
                    },
                    { type: 'paragraph', text: 'Les sept objets mis à jour doivent apparaître dans les résultats.' },
                    {
                        type: 'note',
                        text: 'Si vous avez retenu des objets prescrits, choisissez aussi **Prescrits et non-prescrits** sous **Objets prescrits** : par défaut, seuls les objets non prescrits sont affichés.',
                    },
                    {
                        type: 'appLink',
                        label: 'Vérifier dans le Tableau',
                        path: '/table',
                        filter: {
                            detectionValidationStatuses: ['SUSPECT'],
                            detectionControlStatuses: ['CONTROLLED_FIELD'],
                            prescripted: null,
                        },
                    },
                ],
            },
            {
                title: 'Compétences mobilisées',
                blocks: [
                    {
                        type: 'list',
                        items: [
                            'filtrer les objets ;',
                            'naviguer du tableau vers la carte ;',
                            'consulter une fiche objet ;',
                            'télécharger une fiche de signalement ;',
                            'modifier individuellement un statut de contrôle ;',
                            'ajouter un commentaire ;',
                            'vérifier le résultat dans le tableau.',
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'courriers-prealables',
        label: 'Exercice 2',
        title: 'Mettre à jour une campagne de courriers préalables',
        objective:
            'Apprendre à identifier les objets ayant déjà fait l’objet d’un contrôle et à enregistrer l’envoi d’un courrier préalable.',
        relatedVideoIds: [VIDEO_IDS.STATUSES, VIDEO_IDS.CONTROL_STATUSES, VIDEO_IDS.TABLE],
        sections: [
            {
                title: 'Situation',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'À la suite d’une campagne de contrôles, votre service a décidé d’envoyer un courrier préalable pour sept objets. Les courriers ont été vérifiés et envoyés. Vous devez maintenant mettre à jour AIGLE.',
                    },
                ],
            },
            {
                title: '1. Identifier les objets concernés',
                blocks: [
                    { type: 'paragraph', text: 'Dans l’onglet **Tableau** :' },
                    {
                        type: 'list',
                        items: [
                            'sélectionnez la commune ;',
                            'filtrez les objets dont le statut de contrôle est **Contrôlé terrain** ;',
                            'repérez sept objets concernés par la campagne de courriers.',
                        ],
                    },
                    presetLink(
                        'Ouvrir le Tableau avec le filtre « Envoyer des courriers préalables »',
                        '/table',
                        'SEND_PRIOR_LETTERS',
                    ),
                ],
            },
            {
                title: '2. Vérifier chaque objet',
                blocks: [
                    { type: 'paragraph', text: 'Pour chacun des objets :' },
                    {
                        type: 'list',
                        items: [
                            'consultez la fiche ;',
                            'vérifiez la référence cadastrale ;',
                            'vérifiez les photographies disponibles ;',
                            'contrôlez l’identité ou les informations utiles au courrier ;',
                            'vérifiez que le courrier correspond bien à l’objet et à la parcelle.',
                        ],
                    },
                ],
            },
            {
                title: '3. Enregistrer l’envoi des courriers',
                blocks: [
                    { type: 'paragraph', text: 'Pour chacun des sept objets :' },
                    {
                        type: 'list',
                        items: [
                            'ouvrez la fiche de l’objet dans le panneau latéral ;',
                            'modifiez le statut de contrôle ;',
                            'sélectionnez **Courrier préalable envoyé** ;',
                            'ajoutez un commentaire, par exemple :',
                        ],
                    },
                    { type: 'example', text: 'Courrier préalable envoyé le [date].' },
                    AUTO_SAVE_NOTE,
                ],
            },
            {
                title: 'Compteur d’actions',
                blocks: [actionsChecklist('courriers-prealables', 'Courrier préalable envoyé')],
            },
            {
                title: 'Vérification finale',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Dans l’onglet **Tableau**, filtrez les résultats avec le statut **Courrier préalable envoyé** et vérifiez que les sept objets apparaissent. Les commentaires ne sont pas affichés dans le tableau : ouvrez la fiche de chaque objet pour vérifier qu’ils ont bien été enregistrés.',
                    },
                    {
                        type: 'appLink',
                        label: 'Vérifier dans le Tableau',
                        path: '/table',
                        filter: { detectionControlStatuses: ['PRIOR_LETTER_SENT'], prescripted: null },
                    },
                ],
            },
            {
                title: 'Variante avec l’édition multiple',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Après avoir réalisé les sept modifications individuellement, vous pouvez tester la fonctionnalité **Édition multiple** sur des objets d’entraînement :',
                    },
                    {
                        type: 'list',
                        items: [
                            'cliquez sur **Édition multiple** ;',
                            'délimitez une zone ;',
                            'vérifiez soigneusement les objets sélectionnés ;',
                            'renseignez uniquement le statut à modifier ;',
                            'validez avec **Éditer les détections**.',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Sur la carte, seuls les objets affichés avec les filtres actifs sont sélectionnés, dans la limite de 500 détections. Vérifiez attentivement la sélection avant de valider, car la modification s’applique à tous les objets retenus.',
                    },
                ],
            },
        ],
    },
    {
        id: 'cycle-de-traitement',
        label: 'Exercice 3',
        title: 'Suivre le cycle de traitement de plusieurs objets',
        objective:
            'Comprendre la différence entre les étapes du statut de contrôle et savoir retrouver les objets selon l’avancement de la procédure.',
        relatedVideoIds: [VIDEO_IDS.CONTROL_STATUSES, VIDEO_IDS.STATUSES],
        sections: [
            {
                title: 'Situation',
                blocks: [
                    { type: 'paragraph', text: 'Votre service suit plusieurs situations à des étapes différentes :' },
                    {
                        type: 'list',
                        items: [
                            'deux objets ont été contrôlés sur le terrain ;',
                            'deux courriers préalables ont été envoyés ;',
                            'un procès-verbal a été dressé ;',
                            'une procédure est en jugement ;',
                            'une parcelle a été remise en état.',
                        ],
                    },
                    { type: 'paragraph', text: 'Vous devez enregistrer ces sept évolutions dans AIGLE.' },
                ],
            },
            {
                title: 'Action 1 — Premier contrôle terrain',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un objet **Non contrôlé** et passez-le en **Contrôlé terrain**. Ajoutez le commentaire :',
                    },
                    { type: 'example', text: 'Contrôle terrain réalisé le [date].' },
                ],
            },
            {
                title: 'Action 2 — Deuxième contrôle terrain',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un autre objet **Non contrôlé** et passez-le en **Contrôlé terrain**. Ajoutez le commentaire correspondant.',
                    },
                ],
            },
            {
                title: 'Action 3 — Premier courrier préalable',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un objet déjà contrôlé et passez-le en **Courrier préalable envoyé**. Ajoutez la date d’envoi dans le commentaire.',
                    },
                ],
            },
            {
                title: 'Action 4 — Deuxième courrier préalable',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un autre objet déjà contrôlé et passez-le en **Courrier préalable envoyé**. Ajoutez la date d’envoi.',
                    },
                ],
            },
            {
                title: 'Action 5 — Procès-verbal dressé',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un objet pour lequel un procès-verbal a réellement été établi et passez-le en **PV dressé**. Renseignez la date du procès-verbal dans le champ **Date du PV**, ou une référence interne dans le commentaire, sans renseigner de données personnelles inutiles.',
                    },
                ],
            },
            {
                title: 'Action 6 — Procédure en jugement',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un objet dont le dossier a été transmis à l’autorité judiciaire et passez-le en **En jugement**. Ajoutez uniquement les informations de suivi utiles à votre service.',
                    },
                ],
            },
            {
                title: 'Action 7 — Remise en état',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Sélectionnez un objet dont l’installation a été retirée, démolie ou régularisée et passez-le en **Remis en état**. Ajoutez un commentaire, par exemple :',
                    },
                    { type: 'example', text: 'Remise en état constatée le [date].' },
                ],
            },
            {
                title: 'Compteur d’actions',
                blocks: [
                    {
                        type: 'checklist',
                        id: 'cycle-de-traitement',
                        items: [
                            '2 objets passés en **Contrôlé terrain**',
                            '2 objets passés en **Courrier préalable envoyé**',
                            '1 objet passé en **PV dressé**',
                            '1 objet passé en **En jugement**',
                            '1 objet passé en **Remis en état**',
                        ],
                        summary: '**Total : 7 modifications du statut de contrôle**',
                    },
                ],
            },
            {
                title: 'Vérification finale',
                blocks: [
                    { type: 'paragraph', text: 'Utilisez successivement les filtres du tableau pour afficher :' },
                    {
                        type: 'list',
                        items: [
                            'les objets **Contrôlés terrain** ;',
                            'les objets avec **Courrier préalable envoyé** ;',
                            'les objets avec **PV dressé** ;',
                            'les objets **En jugement** ;',
                            'les objets **Remis en état**.',
                        ],
                    },
                    { type: 'paragraph', text: 'Vérifiez que chaque objet apparaît dans la bonne catégorie.' },
                    {
                        type: 'note',
                        text: 'Un objet indiqué comme **Remis en état** n’apparaît plus dans les vues opérationnelles par défaut. Activez ce statut dans les filtres (ou choisissez le filtre rapide **Remis en état**), ou recherchez directement la parcelle pour retrouver son historique.',
                    },
                ],
            },
        ],
    },
    {
        id: 'faux-positifs',
        label: 'Exercice 4',
        title: 'Vérifier les faux positifs',
        objective:
            'Notre modèle d’IA présente un taux d’erreur moyen de 10 % sur les objets détectés. Il est donc essentiel de vérifier les éventuels « faux positifs ».',
        relatedVideoIds: [VIDEO_IDS.DETECTED_OBJECTS, VIDEO_IDS.MAP, VIDEO_IDS.STATUSES],
        sections: [
            {
                title: 'Comment procéder ?',
                blocks: [
                    {
                        type: 'list',
                        ordered: true,
                        items: [
                            'Dans l’onglet **Carte**, ouvrez le panneau **Filtrer les objets** : sous **Objets prescrits**, choisissez **Prescrits et non-prescrits**, puis ne gardez que le statut de validation **Non vérifié**.',
                            'Pour chaque objet affiché, assurez-vous que **l’objet correspond bien au type de détection attendu** (par exemple, une caravane bien identifiée comme une caravane, et non comme une construction en dur).',
                            'Assurez-vous aussi que **l’objet n’est pas une fausse détection**, comme un tas de pierres, l’ombre d’un arbre ou tout autre élément ayant pu induire le modèle en erreur.',
                        ],
                    },
                    {
                        type: 'appLink',
                        label: 'Ouvrir la Carte avec ces filtres',
                        path: '/map',
                        filter: { detectionValidationStatuses: ['DETECTED_NOT_VERIFIED'], prescripted: null },
                    },
                    {
                        type: 'note',
                        text: 'Selon le cas, corrigez le **type d’objet**, passez l’objet en **Invalidé** s’il s’agit d’une erreur de détection, ou en **Suspect** s’il doit être analysé ou contrôlé.',
                    },
                ],
            },
        ],
    },
    {
        id: 'operation-groupee',
        label: 'Exercice complémentaire',
        title: 'Préparer et mettre à jour une opération groupée',
        objective:
            'Utiliser AIGLE pour préparer une campagne de contrôle, puis tester la mise à jour de plusieurs objets.',
        relatedVideoIds: [VIDEO_IDS.TABLE, VIDEO_IDS.MAP],
        sections: [
            {
                title: 'Consignes',
                blocks: [
                    {
                        type: 'list',
                        ordered: true,
                        items: [
                            'Ouvrez l’onglet **Tableau**.',
                            'Filtrez les objets **Suspects** et **Non contrôlés**.',
                            'Triez les parcelles selon le nombre de détections : cliquez deux fois sur l’en-tête de la colonne **Nombre de détections** pour afficher d’abord celles qui en comptent le plus.',
                            'Sélectionnez une parcelle comportant plusieurs objets.',
                            'Ouvrez les objets sur la carte.',
                            'Téléchargez les fiches de signalement nécessaires.',
                            'Après le contrôle, modifiez individuellement le statut de sept objets.',
                            'Utilisez ensuite l’outil **Édition multiple** sur un autre groupe d’objets d’entraînement.',
                            'Retournez dans le tableau pour vérifier les modifications.',
                        ],
                    },
                    presetLink('Ouvrir le Tableau avec le filtre « Préparer des visites »', '/table', 'PREPARE_VISITS'),
                ],
            },
            {
                title: 'Résultat attendu',
                blocks: [
                    {
                        type: 'paragraph',
                        text: 'Vous savez préparer une opération, mettre à jour des objets individuellement, utiliser l’édition multiple et vérifier la cohérence des données après modification.',
                    },
                ],
            },
        ],
    },
];

export const PATH_VALIDATION: ContentBlock[] = [
    { type: 'paragraph', text: 'À l’issue des exercices, vous devez être capable de :' },
    {
        type: 'checklist',
        id: 'validation-du-parcours',
        items: [
            'rechercher une commune ou une parcelle ;',
            'filtrer les objets selon leur statut ;',
            'identifier les objets suspects non contrôlés ;',
            'consulter les photographies de différents millésimes ;',
            'télécharger une fiche de signalement ;',
            'modifier le statut de contrôle d’un objet ;',
            'ajouter un commentaire de suivi ;',
            'mettre à jour au moins sept objets ;',
            'utiliser l’édition multiple avec précaution ;',
            'retrouver les objets remis en état ou sortis des vues actives ;',
            'vérifier les modifications depuis l’onglet Tableau.',
        ],
    },
];
