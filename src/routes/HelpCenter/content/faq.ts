import { FaqCategory } from './types';

// Transcribed from the support team's "Préparation support BREVO AIGLE" document, minus the notes
// meant for support agents, with UI references aligned on the app.
export const FAQ_CATEGORIES: FaqCategory[] = [
    {
        id: 'objets-detectes',
        title: 'Les objets détectés sur la carte',
        questions: [
            {
                id: 'couleurs-des-carres',
                question: 'À quoi servent les couleurs des carrés sur la carte ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Chaque couleur correspond à un type d’objet détecté pour lequel l’IA a été entraînée :',
                    },
                    {
                        type: 'list',
                        items: [
                            'Rouge : caravane ;',
                            'Orange : mobil-home ;',
                            'Vert : construction en dur (au sens du code de l’urbanisme, cela comprend également les installations parfois qualifiées de « légères ») ;',
                            'Bleu : piscine ;',
                            'Violet : navire.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Activez **Afficher la légende**, en bas à gauche de la carte, pour afficher la correspondance complète entre les couleurs et les types d’objets.',
                    },
                    {
                        type: 'paragraph',
                        text: 'La catégorie **Autres** (couleur blanche) regroupe les objets qui ne correspondent pas aux principales catégories reconnues par AIGLE mais qui ont été requalifiés. Elle peut notamment inclure des pylônes, des châteaux d’eau, des déchets, des serres ou d’autres éléments présents dans les zones naturelles, agricoles et forestières. Elle n’est pas affichée par défaut : sélectionnez-la dans les filtres pour voir ces objets.',
                    },
                ],
            },
            {
                id: 'afficher-masquer-couleurs',
                question: 'Comment afficher ou masquer certaines couleurs ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Filtrer les objets** (icône en forme d’entonnoir, en haut à gauche de la carte), puis sélectionnez ou désélectionnez les types d’objets que vous souhaitez afficher.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Dans **Types d’objets**, cliquez sur la croix d’un type pour masquer les objets correspondants. Pour les faire réapparaître, sélectionnez à nouveau le type d’objet dans la liste.',
                    },
                    { type: 'paragraph', text: 'Vous pouvez combiner plusieurs critères :' },
                    {
                        type: 'list',
                        items: [
                            'filtres rapides ;',
                            'score ;',
                            'objets prescrits ;',
                            'type d’objet ;',
                            'statut de validation ;',
                            'statut de contrôle ;',
                            'zone à enjeux.',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Avant toute analyse, vérifiez les filtres actifs. Un objet peut être présent dans AIGLE mais masqué par les paramètres d’affichage.',
                    },
                ],
            },
            {
                id: 'definition-detection',
                question: 'Qu’est-ce qu’une détection ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Une détection est un objet identifié automatiquement par l’intelligence artificielle d’AIGLE.',
                    },
                    {
                        type: 'paragraph',
                        text: 'L’algorithme a été entraîné et il analyse les images aériennes prises à différentes dates afin de repérer l’apparition de nouveaux éléments dans les zones naturelles, agricoles ou forestières.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Par exemple, un objet peut apparaître comme une nouvelle détection sur une photographie prise en 2023 s’il n’était pas présent sur la photographie de 2019.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Une détection constitue un **signal à vérifier**. Elle ne prouve pas automatiquement l’existence d’une infraction.',
                    },
                ],
            },
            {
                id: 'definition-objet-detecte',
                question: 'Qu’est-ce qu’un objet détecté ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Un objet détecté est une construction ou une installation identifiée sur une zone naturelle, agricole ou forestière, par exemple :',
                    },
                    {
                        type: 'list',
                        items: ['une caravane ;', 'une piscine ;', 'un bâtiment ;', 'un mobil-home ;', 'un bateau.'],
                    },
                    {
                        type: 'paragraph',
                        text: 'Il est représenté sur la carte par un carré ou un rectangle coloré et associé à différentes informations :',
                    },
                    {
                        type: 'list',
                        items: [
                            'une commune ;',
                            'une parcelle cadastrale ;',
                            'des coordonnées GPS ;',
                            'un type d’objet ;',
                            'une date ou une période d’apparition ;',
                            'un statut de validation ;',
                            'un statut de contrôle.',
                        ],
                    },
                ],
            },
            {
                id: 'ia-peut-se-tromper',
                question: 'L’intelligence artificielle peut-elle se tromper ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Oui. Les détections automatiques doivent être vérifiées par un utilisateur. Le taux d’objets mal détectés, que l’on appelle également « faux positifs », est d’environ 10 % lorsque le score de fiabilité est fixé à 30 %. Nous vous recommandons de ne pas modifier le score de fiabilité. Cette fonctionnalité doit être réservée aux utilisateurs avancés d’AIGLE.',
                    },
                    {
                        type: 'paragraph',
                        text: 'L’intelligence artificielle peut par exemple confondre un objet avec :',
                    },
                    { type: 'list', items: ['une ombre ;', 'de la végétation ;', 'un tas de pierres.'] },
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’une détection ne correspond pas à un objet pertinent, attribuez-lui le statut **Invalidé** et ajoutez un commentaire si nécessaire. Si l’IA a détecté une caravane alors que l’objet est un mobil-home, vous pouvez changer le type d’objet.',
                    },
                ],
            },
            {
                id: 'aucune-detection-sur-la-carte',
                question: 'Je ne vois aucune détection sur ma carte. Est-ce normal ?',
                answer: [
                    { type: 'paragraph', text: 'Plusieurs explications sont possibles :' },
                    {
                        type: 'list',
                        items: [
                            'le niveau de zoom : les détections n’apparaissent qu’à partir d’un zoom suffisant ;',
                            'les filtres actifs masquent les objets ;',
                            'les statuts affichés excluent les détections présentes ;',
                            'vous ne disposez pas des droits nécessaires pour accéder à ce territoire ;',
                            'les données du territoire ne sont pas encore disponibles dans AIGLE.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Commencez par choisir le filtre rapide **Par défaut** dans **Filtrer les objets**, et vérifiez que tous les types d’objets et statuts recherchés sont sélectionnés.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Si votre commune est couverte et que les filtres sont correctement configurés, contactez l’équipe AIGLE via le tchat intégré ou à l’adresse [contact@aigle.beta.gouv.fr](mailto:contact@aigle.beta.gouv.fr).',
                    },
                    { type: 'paragraph', text: 'Précisez :' },
                    {
                        type: 'list',
                        items: [
                            'votre structure ;',
                            'la commune concernée ;',
                            'les filtres actifs ;',
                            'le navigateur utilisé ;',
                            'ce que vous attendiez ;',
                            'ce qui s’affiche réellement ;',
                            'et, si possible, joignez une capture d’écran.',
                        ],
                    },
                ],
            },
            {
                id: 'pas-de-detection-communes-voisines',
                question: 'Je ne vois pas de détections sur les communes voisines. Est-ce normal ?',
                answer: [
                    { type: 'paragraph', text: 'Oui, cela peut être normal.' },
                    { type: 'paragraph', text: 'La couverture d’AIGLE dépend :' },
                    {
                        type: 'list',
                        items: [
                            'du déploiement progressif sur les territoires ;',
                            'des communes dont les données ont été intégrées ;',
                            'du périmètre d’accès associé à votre compte.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Un utilisateur communal dispose généralement d’un accès limité à sa commune. Les agents d’un EPCI ou d’une DDT(M) peuvent disposer d’un périmètre plus large selon la configuration retenue.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Rapprochez-vous de votre DDT(M) référente ou de l’équipe AIGLE pour vérifier la couverture disponible et vos droits d’accès.',
                    },
                ],
            },
        ],
    },
    {
        id: 'millesimes',
        title: 'Les millésimes et l’historique des images',
        questions: [
            {
                id: 'annees-et-millesimes',
                question: 'À quoi correspondent les années ou millésimes présentés ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Chaque millésime correspond à une campagne de photographies aériennes réalisée sur le territoire, notamment à partir des données de l’IGN. Sur la plupart des territoires, les données sont disponibles tous les 3 ans.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les années indiquées représentent les dates de prise de vue des images utilisées par AIGLE.',
                    },
                    { type: 'paragraph', text: 'Vous pouvez afficher les différents millésimes :' },
                    {
                        type: 'list',
                        items: [
                            'à l’aide des boutons situés en bas à gauche de la carte ;',
                            'ou, après avoir sélectionné un objet, en bas du panneau qui s’affiche à droite de l’écran : sous **Historique de détections**, 2 ou 3 vignettes montrent l’objet à différentes années.',
                        ],
                    },
                ],
            },
            {
                id: 'difference-entre-millesimes',
                question: 'Quelle est la différence entre les millésimes ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'La comparaison entre deux millésimes permet de repérer les objets apparus entre deux campagnes de photographies aériennes.',
                    },
                    { type: 'paragraph', text: 'Par exemple :' },
                    {
                        type: 'list',
                        items: [
                            'l’objet n’est pas visible sur l’image de 2019 ;',
                            'il apparaît sur l’image de 2023 ;',
                            'AIGLE estime donc qu’il est apparu entre ces deux dates.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Cette comparaison permet de suivre l’évolution d’une parcelle et d’estimer l’ancienneté d’un objet et la possible prescription pénale (6 ans).',
                    },
                ],
            },
            {
                id: 'annees-non-disponibles',
                question: 'Pourquoi certaines années ne sont-elles pas disponibles ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Des campagnes de photographies aériennes de l’IGN sont réalisées chaque année sur une partie du territoire, de manière à avoir (sauf exception) une couverture départementale en métropole tous les 3 ans et un peu plus en outre-mer.',
                    },
                    { type: 'paragraph', text: 'La disponibilité dépend notamment :' },
                    {
                        type: 'list',
                        items: [
                            'des campagnes réalisées par l’IGN ;',
                            'des données transmises et intégrées dans AIGLE (en général, une année n n’est disponible qu’en n+1) ;',
                            'du calendrier de traitement du territoire.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le nouveau millésime de votre territoire est intégré progressivement lorsqu’il est disponible.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Si vous disposez d’informations ou de données complémentaires concernant votre territoire, vous pouvez les transmettre à l’équipe AIGLE via le support technique.',
                    },
                ],
            },
            {
                id: 'images-aeriennes-utilisees',
                question: 'Quelles images aériennes sont utilisées par AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE utilise principalement des orthophotographies aériennes de l’IGN.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les tests réalisés par l’équipe montrent que les orthophotographies classiques et les images ORTHO EXPRESS présentent un niveau de précision suffisant pour identifier les principaux objets suivis par AIGLE, notamment les bâtiments et les mobil-homes.',
                    },
                    {
                        type: 'paragraph',
                        text: 'L’IGN indique que la couverture aérienne nationale est produite avec une résolution d’environ 20 centimètres et qu’elle alimente notamment la BD ORTHO et l’ORTHO EXPRESS.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Des tests ont également été réalisés avec des images satellites Pléiades. Les résultats obtenus ont été moins satisfaisants pour les besoins d’AIGLE compte tenu d’images moins précises et cette piste n’est actuellement pas retenue.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Cependant, AIGLE teste de nouvelles images satellites, dites « Pléiades Neo », plus précises et plus fréquentes. Les premiers résultats sont encourageants : s’ils se confirment, ces images pourraient être utilisées à l’avenir.',
                    },
                ],
            },
            {
                id: 'fonctionnement-algorithme',
                question: 'Comment fonctionne l’algorithme de détection ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'L’algorithme d’intelligence artificielle a été entraîné pour reconnaître et différencier des objets (caravanes, mobil-homes, constructions, piscines, navires) sur des images aériennes de différentes années dans les zones analysées.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Chaque détection reçoit un **score de précision**, qui traduit le niveau de confiance de l’algorithme.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Le score recommandé est aujourd’hui fixé à **30**. En dessous de ce seuil, davantage de détections apparaissent, mais elles peuvent être moins fiables. Il peut être pertinent d’abaisser le niveau du seuil lorsqu’il y a très peu de détections sur un territoire.',
                    },
                    {
                        type: 'note',
                        text: 'Une diminution du score augmente le nombre de faux positifs susceptibles d’apparaître sur la carte.',
                    },
                ],
            },
            {
                id: 'alertes-nouvelles-detections',
                question: 'AIGLE peut-il m’alerter lorsqu’une nouvelle détection apparaît ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE permet actuellement de consulter les détections issues des différents passages de l’algorithme sur des années différentes.',
                    },
                    {
                        type: 'paragraph',
                        text: 'La mise en place d’alertes automatiques lors de l’apparition de nouveaux objets ou lors du traitement d’un nouveau millésime fait partie des besoins identifiés pour les évolutions futures.',
                    },
                    { type: 'paragraph', text: 'Pour le moment, cela n’est pas possible dans AIGLE.' },
                ],
            },
        ],
    },
    {
        id: 'prescription',
        title: 'La prescription dans AIGLE',
        questions: [
            {
                id: 'calcul-prescription',
                question: 'Comment est calculée la prescription dans AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE utilise les différents millésimes disponibles pour estimer l’ancienneté d’un objet.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Dans l’outil, le calcul automatique de la prescription est appliqué uniquement aux catégories suivantes :',
                    },
                    { type: 'list', items: ['constructions en dur ;', 'piscines.'] },
                    {
                        type: 'paragraph',
                        text: 'Lorsque le même objet de l’une de ces catégories a déjà été détecté sur une photographie aérienne antérieure d’au moins six ans, AIGLE peut le classer automatiquement dans la catégorie **Prescrit**.',
                    },
                    { type: 'paragraph', text: 'Vous pouvez filtrer les objets selon les catégories :' },
                    {
                        type: 'list',
                        items: ['**Prescrits** ;', '**Non-prescrits** ;', '**Prescrits et non-prescrits**.'],
                    },
                    { type: 'paragraph', text: 'Par défaut, seuls les objets non prescrits sont affichés.' },
                    {
                        type: 'note',
                        text: 'Cette indication repose sur l’analyse des photographies aériennes disponibles. Elle constitue une aide à l’analyse et ne remplace pas une appréciation juridique du dossier.',
                    },
                ],
            },
            {
                id: 'objet-classe-prescrit',
                question: 'Que signifie un objet automatiquement classé « Prescrit » ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’un objet est automatiquement classé **Prescrit**, cela signifie que l’algorithme considère qu’il est visible sur une photographie aérienne datant d’au moins six ans.',
                    },
                    { type: 'paragraph', text: 'Cela ne signifie pas nécessairement :' },
                    {
                        type: 'list',
                        items: [
                            'que l’objet a été correctement identifié ;',
                            'qu’il s’agit réellement d’une construction en dur ou d’une piscine ;',
                            'que les travaux étaient achevés à la date retenue ;',
                            'qu’aucun acte n’a interrompu le délai de prescription ;',
                            'que toute action administrative ou civile est impossible.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Avant d’utiliser cette information dans une procédure, vérifiez :',
                    },
                    {
                        type: 'list',
                        items: [
                            'le type réel de l’objet ;',
                            'sa présence sur les images anciennes ;',
                            'la date probable d’achèvement ;',
                            'les éventuels travaux successifs ;',
                            'les actes de procédure déjà réalisés.',
                        ],
                    },
                ],
            },
            {
                id: 'cocher-prescrit-manuellement',
                question: 'Que signifie le fait de cocher manuellement « Prescrit » ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Depuis la fiche comportant toutes les informations de l’objet, lorsque vous cochez manuellement le statut **Prescrit**, vous indiquez avoir vérifié que l’objet était déjà visible sur les images datant d’au moins six ans.',
                    },
                    { type: 'paragraph', text: 'Avant de modifier ce statut :' },
                    {
                        type: 'list',
                        items: [
                            'consultez les différents millésimes ;',
                            'vérifiez que l’objet est bien identifiable ;',
                            'vérifiez qu’il s’agit d’une construction en dur ou d’une piscine ;',
                            'ajoutez un commentaire en cas de doute ou de situation particulière.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'En cochant « Prescrit », l’objet sera considéré comme tel : lorsque vous afficherez les objets « Non-prescrits » (panneau des filtres de la carte ou tableau), il n’apparaîtra plus.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Le statut ne doit pas être appliqué aux caravanes, mobil-homes et bateaux.',
                    },
                ],
            },
            {
                id: 'prescription-six-ou-dix-ans',
                question: 'La prescription pénale des infractions d’urbanisme est-elle passée de six à dix ans ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Au **16 juillet 2026**, les sources juridiques officielles indiquent toujours un délai de prescription pénale de **six ans** pour les délits d’urbanisme, à compter de l’achèvement des travaux. L’article 8 du Code de procédure pénale prévoit toujours un délai général de six ans pour les délits.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Toutefois, la rédaction d’un PV par un agent assermenté interrompt le délai de prescription : c’est pourquoi il est important d’établir un PV.',
                    },
                    {
                        type: 'paragraph',
                        text: 'À noter : l’action au civil de la commune ou de l’EPCI peut être engagée pendant dix ans à compter de l’achèvement des travaux.',
                    },
                ],
            },
            {
                id: 'prescription-verifiee-par-un-agent',
                question: 'Pourquoi la prescription doit-elle être vérifiée par un agent ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'La photographie aérienne permet d’estimer une période de présence, mais elle ne permet pas toujours de déterminer avec certitude :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la date exacte d’achèvement des travaux ;',
                            'la nature juridique de l’installation ;',
                            'l’existence de travaux successifs ;',
                            'une reconstruction ou une extension plus récente ;',
                            'une interruption du délai de prescription ;',
                            'l’existence d’une autorisation ou d’une régularisation.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le statut proposé par AIGLE doit donc être considéré comme une aide au ciblage et non comme une qualification juridique définitive.',
                    },
                ],
            },
        ],
    },
    {
        id: 'filtres-couches-affichage',
        title: 'Filtres, couches et affichage',
        questions: [
            {
                id: 'afficher-un-seul-type-d-objet',
                question: 'Comment afficher uniquement le type d’objet qui m’intéresse ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Filtrer les objets**, puis ne gardez dans **Types d’objets** que le ou les types souhaités, par exemple :',
                    },
                    {
                        type: 'list',
                        items: [
                            'caravane ;',
                            'mobil-home ;',
                            'piscine ;',
                            'construction en dur ;',
                            'bateau ;',
                            'autres.',
                        ],
                    },
                ],
            },
            {
                id: 'objets-dans-des-zones-particulieres',
                question: 'Comment afficher les objets situés dans des zones particulières ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Dans le panneau **Filtrer les objets**, rubrique **Zones à enjeux**, activez les zones à enjeux souhaitées, par exemple :',
                    },
                    {
                        type: 'list',
                        items: [
                            'zones naturelles et agricoles ;',
                            'zones environnementales ;',
                            'zones à risque et, dans certains cas : zones à risque d’inondation, zones à risque d’incendie, zones couvertes par un PPR.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'La superposition des couches permet notamment d’identifier les objets situés dans plusieurs zones sensibles et de prioriser les contrôles.',
                    },
                ],
            },
            {
                id: 'sources-des-zones-a-enjeux',
                question: 'D’où proviennent les données des zones à enjeux ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les zones à enjeux affichées dans AIGLE proviennent de différentes sources publiques, selon la catégorie concernée.',
                    },
                    {
                        type: 'table',
                        head: ['Catégorie', 'Exemples de données', 'Source principale'],
                        rows: [
                            [
                                'Urbanisme',
                                'Zones agricoles et naturelles des PLU ou PLUi, cartes communales, servitudes',
                                'Géoportail de l’urbanisme',
                            ],
                            [
                                'Environnement',
                                'Natura 2000, ZNIEFF, espaces protégés',
                                'Inventaire national du patrimoine naturel',
                            ],
                            [
                                'Risques',
                                'PPR, inondation, feu de forêt, mouvements de terrain et autres risques naturels',
                                'Géorisques et services de l’État',
                            ],
                            ['Cadastre', 'Parcelles, sections, emprises bâties', 'Plan cadastral de la DGFiP'],
                            ['Imagerie', 'Photographies aériennes et orthophotographies', 'IGN'],
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le Géoportail de l’urbanisme diffuse notamment les PLU, PLUi, cartes communales et servitudes d’utilité publique. L’INPN diffuse les données ZNIEFF et Natura 2000, tandis que Géorisques met à disposition différentes données relatives aux risques naturels et technologiques.',
                    },
                    {
                        type: 'note',
                        text: 'La disponibilité et l’actualisation des couches peuvent varier selon les territoires et les publications des organismes sources.',
                    },
                ],
            },
            {
                id: 'afficher-le-cadastre',
                question: 'Comment afficher le cadastre ?',
                answer: [
                    { type: 'paragraph', text: 'Cliquez sur **Affichage des couches**, puis cochez **Cadastre**.' },
                    {
                        type: 'paragraph',
                        text: 'Zoomez suffisamment sur la carte, généralement entre 50 et 300 mètres, pour faire apparaître les limites des parcelles.',
                    },
                ],
            },
            {
                id: 'cadastre-ne-s-affiche-pas',
                question: 'Pourquoi le cadastre ne s’affiche-t-il pas ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Le cadastre n’est visible qu’à un niveau de zoom suffisamment précis.',
                    },
                    { type: 'paragraph', text: 'Vérifiez que :' },
                    {
                        type: 'list',
                        items: [
                            'la couche **Cadastre** est activée ;',
                            'vous avez suffisamment zoomé ;',
                            'votre connexion internet est stable ;',
                            'la donnée cadastrale est disponible sur le secteur concerné.',
                        ],
                    },
                ],
            },
            {
                id: 'nom-des-proprietaires',
                question: 'AIGLE donne-t-il accès au nom des propriétaires ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE affiche actuellement les informations géographiques et cadastrales nécessaires à la localisation des objets, mais ne donne pas directement accès aux données nominatives des propriétaires.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Un rapprochement avec des fichiers cadastraux de la DGFiP est envisagé afin de faciliter l’identification des propriétaires. Cette évolution serait probablement plus adaptée à LUCCA, qui est consacré au suivi des dossiers et des procédures.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les références cadastrales, coordonnées géographiques et informations permettant d’identifier indirectement un propriétaire peuvent constituer des données personnelles. Leur traitement doit donc être encadré dans le cadre du RGPD et de la démarche menée avec la CNIL.',
                    },
                ],
            },
            {
                id: 'parcelles-avec-le-plus-d-objets',
                question: 'Comment voir les parcelles comportant le plus d’objets ?',
                answer: [
                    { type: 'paragraph', text: 'Ouvrez l’onglet **Tableau**, dans le bandeau supérieur.' },
                    {
                        type: 'paragraph',
                        text: 'Vous pouvez ensuite trier les résultats selon le nombre de détections présentes sur chaque parcelle.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur la flèche de la colonne **Nombre de détections** jusqu’à afficher les résultats par ordre décroissant. Les parcelles comportant le plus grand nombre d’objets apparaîtront en premier.',
                    },
                    { type: 'paragraph', text: 'Cette fonctionnalité peut aider à prioriser les contrôles.' },
                ],
            },
            {
                id: 'objets-du-tableau-absents-carte',
                question: 'Pourquoi certains objets présents dans le tableau ne sont-ils pas visibles sur la carte ?',
                answer: [
                    { type: 'paragraph', text: 'Vérifiez notamment :' },
                    {
                        type: 'list',
                        items: [
                            'les filtres actifs ;',
                            'le niveau de zoom et la zone affichée à l’écran ;',
                            'les statuts sélectionnés ;',
                            'les types d’objets affichés ;',
                            'le score ;',
                            'le statut de contrôle **Remis en état** ou le statut de validation **Invalidé**.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Si les paramètres semblent corrects, transmettez au support la commune, la parcelle et, si possible, une capture d’écran.',
                    },
                ],
            },
        ],
    },
    {
        id: 'modifier-ajouter-objets',
        title: 'Modifier et ajouter des objets',
        questions: [
            {
                id: 'mettre-a-jour-un-objet',
                question: 'Comment mettre à jour un objet ?',
                answer: [
                    { type: 'paragraph', text: 'Cliquez sur l’objet sur la carte. Le panneau latéral s’ouvre.' },
                    { type: 'paragraph', text: 'Selon vos droits, vous pouvez modifier :' },
                    {
                        type: 'list',
                        items: [
                            'le type d’objet ;',
                            'le statut de validation ;',
                            'le statut de contrôle ;',
                            'les informations relatives à la prescription ;',
                            'les commentaires associés.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Les modifications sont enregistrées automatiquement, sans bouton de validation.',
                    },
                    {
                        type: 'note',
                        text: 'Vous devez disposer des droits de modification. Si les champs ne sont pas modifiables, contactez votre administrateur.',
                    },
                ],
            },
            {
                id: 'objet-mal-positionne',
                question: 'Comment corriger un objet mal positionné ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Il n’est pas possible de déplacer une détection générée automatiquement par l’intelligence artificielle.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Le carré ou le rectangle correspond à la zone identifiée par l’algorithme sur la photographie aérienne.',
                    },
                    { type: 'paragraph', text: 'Lorsque la détection est mal positionnée :' },
                    {
                        type: 'list',
                        items: [
                            'passez son statut de validation à **Invalidé** ;',
                            'ajoutez un commentaire expliquant la correction ;',
                            'créez manuellement un nouvel objet au bon emplacement si nécessaire.',
                        ],
                    },
                ],
            },
            {
                id: 'type-d-objet-mal-identifie',
                question: 'Comment corriger le type d’un objet mal identifié ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur l’objet, puis modifiez le champ **Type d’objet** dans le panneau latéral, puis sélectionnez le type réel de l’objet.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Vous pouvez ajouter un commentaire libre pour apporter des précisions si besoin.',
                    },
                ],
            },
            {
                id: 'ajouter-un-objet-manquant',
                question: 'Comment ajouter un objet manquant sur la carte ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Dessiner un objet** (icône en forme de crayon), en haut à droite de la carte, puis :',
                    },
                    {
                        type: 'list',
                        items: [
                            'dessinez un rectangle autour de l’objet ;',
                            'sélectionnez le type d’objet ;',
                            'cliquez sur **Ajouter l’objet**.',
                        ],
                    },
                    { type: 'paragraph', text: 'L’ajout manuel est particulièrement utile lorsque :' },
                    {
                        type: 'list',
                        items: [
                            'l’objet est plus récent que les dernières images disponibles ;',
                            'l’objet a été repéré lors d’un contrôle terrain ;',
                            'l’objet est visible sur la photographie mais n’a pas été reconnu par l’algorithme ;',
                            'vous souhaitez compléter les informations disponibles sur la parcelle.',
                        ],
                    },
                ],
            },
            {
                id: 'supprimer-une-detection',
                question: 'Puis-je supprimer définitivement une détection ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Une détection automatique n’a généralement pas vocation à être supprimée de l’historique.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’elle correspond à une remise en état naturel de la parcelle, sélectionnez le statut de contrôle **Remis en état**.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’elle correspond à une erreur de l’intelligence artificielle ou à un objet qui ne doit pas être traité, utilisez le statut **Invalidé**.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Cette pratique permet de conserver la traçabilité des données tout en retirant la détection des analyses opérationnelles.',
                    },
                ],
            },
        ],
    },
    {
        id: 'fiche-objet-et-statuts',
        title: 'La fiche objet et la gestion des statuts',
        questions: [
            {
                id: 'informations-d-un-objet',
                question: 'Où trouver les informations d’un objet ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur l’objet sur la carte. Le panneau latéral affiche notamment :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la commune ;',
                            'le numéro de parcelle ;',
                            'les coordonnées GPS ;',
                            'l’adresse, lorsqu’elle est disponible ;',
                            'le type d’objet ;',
                            'la source et les dates des images ;',
                            'le statut de validation ;',
                            'le statut de contrôle ;',
                            'les informations liées à la prescription ;',
                            'les commentaires ;',
                            'les différents millésimes de photographies aériennes.',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Certaines de ces informations (commune, adresse, coordonnées GPS, parcelle, zones à enjeux) sont regroupées dans la section **Informations générales**, à déplier.',
                    },
                ],
            },
            {
                id: 'changer-statut-de-validation',
                question: 'Comment changer le statut de validation d’un objet ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur l’objet, puis choisissez **Suspect**, **Légal** ou **Invalidé** dans le panneau latéral. Les statuts de validation sont :',
                    },
                    {
                        type: 'list',
                        items: [
                            '**Non vérifié** : l’objet a été détecté par l’IA mais n’a pas encore été analysé par un utilisateur (aucun bouton n’est alors sélectionné) ;',
                            '**Suspect** : un utilisateur a vérifié l’objet et considère qu’il est suspect et peut nécessiter un contrôle ou une analyse complémentaire ;',
                            '**Légal** : une autorisation ou un élément permettant de considérer l’objet comme régulier a été identifié, soit automatiquement grâce au croisement d’AIGLE avec SITADEL, soit manuellement lorsque l’utilisateur a la preuve que l’objet bénéficie d’une autorisation ;',
                            '**Invalidé** : l’objet correspond à une erreur de détection ou ne relève pas du traitement attendu.',
                        ],
                    },
                ],
            },
            {
                id: 'non-verifie-ou-suspect',
                question: 'Quelle est la différence entre « Non vérifié » et « Suspect » ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Le statut **Non vérifié** signifie que c’est l’algorithme d’intelligence artificielle qui a reconnu l’objet, mais qu’aucun utilisateur n’a encore qualifié la détection.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Le statut **Suspect** signifie qu’un utilisateur a examiné la détection et considère qu’elle correspond bien à un objet suspect devant être surveillé, contrôlé ou analysé.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Dans le cadre du « nettoyage » des données, les objets effectivement repérés et présentant un doute doivent être passés du statut **Non vérifié** au statut **Suspect**.',
                    },
                    { type: 'paragraph', text: 'En revanche :' },
                    {
                        type: 'list',
                        items: [
                            'si l’objet est une erreur de détection, passez-le en **Invalidé** ;',
                            'si une autorisation ou un élément établissant sa régularité est identifié, passez-le en **Légal**.',
                        ],
                    },
                ],
            },
            {
                id: 'nettoyer-les-donnees',
                question: 'Comment nettoyer les données de mon territoire ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Le nettoyage consiste à examiner les objets encore classés **Non vérifié** et à leur attribuer un statut adapté.',
                    },
                    { type: 'paragraph', text: 'Pour chaque objet :' },
                    {
                        type: 'list',
                        items: [
                            'consultez les photographies et les informations de la fiche ;',
                            'vérifiez la nature de l’objet ;',
                            'passez-le en **Suspect** s’il correspond bien à un objet devant être analysé ou contrôlé ;',
                            'passez-le en **Invalidé** s’il s’agit d’une erreur de l’IA ;',
                            'passez-le en **Légal** si une autorisation ou un élément établissant sa régularité est disponible.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'L’objectif est de réduire progressivement le nombre d’objets **Non vérifiés** afin de disposer de statistiques et de priorités d’action plus fiables.',
                    },
                ],
            },
            {
                id: 'changer-statut-de-controle',
                question: 'Comment changer le statut de contrôle d’un objet ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur l’objet, puis choisissez dans **Statut du contrôle** l’étape correspondant à l’avancement de l’action :',
                    },
                    {
                        type: 'list',
                        items: [
                            '**Non contrôlé** : aucune action de contrôle n’a encore été menée sur l’objet ;',
                            '**À contrôler** : l’objet est repéré comme devant faire l’objet d’un contrôle ;',
                            '**Contrôlé terrain** : un agent s’est rendu sur place pour constater la situation ;',
                            '**Courrier préalable envoyé** : un courrier préalable a été adressé au propriétaire ;',
                            '**PV dressé** : un procès-verbal d’infraction a été dressé (l’objet n’est alors plus prescrit) ;',
                            '**Astreinte Administrative** : une astreinte administrative a été prononcée ;',
                            '**En jugement** : le dossier est porté devant la justice ;',
                            '**Rapport de constatations rédigé** : les constatations du contrôle ont été formalisées dans un rapport ;',
                            '**Remis en état** : la situation a été régularisée et le terrain remis en état.',
                        ],
                    },
                ],
            },
            {
                id: 'validation-ou-controle',
                question: 'Quelle est la différence entre le statut de validation et le statut de contrôle ?',
                answer: [
                    { type: 'paragraph', text: 'Le **statut de validation** qualifie la détection :' },
                    {
                        type: 'list',
                        items: ['l’objet a-t-il été vérifié ?', 'est-il suspect, légal ou invalidé ?'],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le **statut de contrôle** indique l’avancement de l’action menée par les services :',
                    },
                    {
                        type: 'list',
                        items: [
                            'un contrôle a-t-il été réalisé ?',
                            'un courrier a-t-il été envoyé ?',
                            'un PV a-t-il été dressé ?',
                            'la parcelle a-t-elle été remise en état ?',
                        ],
                    },
                ],
            },
            {
                id: 'statut-en-jugement',
                question: 'Que signifie le statut « En jugement » ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Le statut **En jugement** indique que le dossier a été transmis à l’autorité judiciaire et qu’une procédure juridictionnelle est en cours ou attendue.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Le détail de la procédure et des échanges avec le parquet n’est pas suivi intégralement dans AIGLE.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour un suivi plus précis, utilisez les outils et dossiers métiers associés, notamment LUCCA lorsque celui-ci est déployé.',
                    },
                ],
            },
            {
                id: 'statut-remis-en-etat',
                question: 'À quoi sert le statut « Remis en état » ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Le statut **Remis en état** indique que l’installation ou la construction concernée a été retirée, démolie ou régularisée de manière à restaurer la parcelle.',
                    },
                    { type: 'paragraph', text: 'Il permet notamment :' },
                    {
                        type: 'list',
                        items: [
                            'de mesurer les résultats des actions menées ;',
                            'de retirer les objets actifs des vues opérationnelles ;',
                            'de conserver une trace de la situation antérieure ;',
                            'd’alimenter les indicateurs d’impact.',
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'sitadel-autorisations',
        title: 'SITADEL et les autorisations d’urbanisme',
        questions: [
            {
                id: 'qu-est-ce-que-sitadel',
                question: 'Qu’est-ce que SITADEL ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'SITADEL est une base nationale recensant les principales demandes et autorisations d’urbanisme traitées par les services instructeurs.',
                    },
                    { type: 'paragraph', text: 'Elle contient notamment des informations relatives :' },
                    {
                        type: 'list',
                        items: [
                            'aux permis de construire ;',
                            'aux déclarations préalables ;',
                            'aux permis d’aménager ;',
                            'aux permis de démolir ;',
                            'aux différentes étapes de la vie de certaines autorisations.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Les données proviennent des formulaires traités par les centres instructeurs de l’État et des collectivités. Une partie des données relatives aux autorisations délivrées depuis 2013 est diffusée en open data et mise à jour mensuellement.',
                    },
                ],
            },
            {
                id: 'utilisation-de-sitadel',
                question: 'Comment SITADEL est-il utilisé dans AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE utilise les données de SITADEL pour identifier les autorisations d’urbanisme connues sur les parcelles.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’une autorisation correspondant à une parcelle est retrouvée, AIGLE peut faire évoluer automatiquement le statut d’un objet vers **Légal**.',
                    },
                    {
                        type: 'note',
                        text: 'La présence d’une autorisation sur une parcelle constitue un indice utile, mais elle ne garantit pas nécessairement que tous les objets présents sur cette parcelle sont autorisés ou conformes.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Une vérification humaine reste nécessaire, notamment lorsque :',
                    },
                    {
                        type: 'list',
                        items: [
                            'plusieurs constructions sont présentes ;',
                            'l’autorisation ne correspond pas clairement à l’objet ;',
                            'l’objet est postérieur à l’autorisation ;',
                            'les travaux réalisés semblent différents du projet autorisé.',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Un statut **Légal** attribué automatiquement grâce à SITADEL est verrouillé dans la fiche de l’objet. S’il vous semble erroné, contactez l’équipe AIGLE.',
                    },
                ],
            },
            {
                id: 'autorisation-connue-absente',
                question: 'Pourquoi une autorisation connue n’apparaît-elle pas dans AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les données SITADEL peuvent être incomplètes, décalées dans le temps ou ne pas permettre un rapprochement automatique avec une détection.',
                    },
                    { type: 'paragraph', text: 'Plusieurs raisons sont possibles :' },
                    {
                        type: 'list',
                        items: [
                            'l’autorisation est ancienne ;',
                            'elle n’a pas encore été transmise ou intégrée ;',
                            'les références cadastrales ont changé ;',
                            'l’autorisation n’entre pas dans le périmètre des données reprises ;',
                            'le rapprochement entre la parcelle et l’objet n’a pas pu être effectué.',
                        ],
                    },
                    { type: 'paragraph', text: 'Si vous connaissez l’autorisation :' },
                    {
                        type: 'list',
                        items: [
                            'vérifiez les références de la parcelle ;',
                            'ajoutez un commentaire dans la fiche objet ;',
                            'passez l’objet en **Légal** si votre vérification permet de confirmer sa régularité ;',
                            'conservez la référence de l’autorisation dans le dossier.',
                        ],
                    },
                ],
            },
            {
                id: 'importer-autorisations-locales',
                question: 'Peut-on importer un fichier local d’autorisations pour compléter SITADEL ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Il n’est pas actuellement possible pour un utilisateur d’importer directement dans AIGLE un fichier Excel ou CSV d’autorisations d’urbanisme afin de mettre automatiquement les objets à jour.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Une intégration complémentaire de données locales peut toutefois être étudiée lorsque SITADEL ne reprend pas l’ensemble des autorisations du territoire.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Cette demande doit être examinée avec l’équipe AIGLE afin de définir :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la source des données ;',
                            'le format du fichier ;',
                            'les références indispensables ;',
                            'les règles de rapprochement avec les parcelles ;',
                            'les modalités de mise à jour du statut **Légal** ;',
                            'les responsabilités de vérification.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le territoire devra probablement préparer et mettre en forme ses données à partir d’un modèle fourni par l’équipe AIGLE.',
                    },
                ],
            },
        ],
    },
    {
        id: 'telechargements-exports',
        title: 'Téléchargements et exports',
        questions: [
            {
                id: 'exporter-tableau',
                question: 'Comment exporter mon tableau ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Ouvrez l’onglet **Tableau**, appliquez les filtres souhaités, puis cliquez sur **Télécharger csv** ou sur **Télécharger xlsx**.',
                    },
                    {
                        type: 'note',
                        text: 'Utilisez les fichiers exportés pour vos analyses ou vos partages, mais privilégiez la mise à jour des données directement dans AIGLE afin de conserver une base commune et actualisée.',
                    },
                ],
            },
            {
                id: 'telecharger-fiche-signalement',
                question: 'Comment télécharger une fiche de signalement ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur l’objet concerné pour ouvrir sa fiche, puis, sous **Fiches de signalement**, cliquez sur **A l’objet** ou sur **A la parcelle**.',
                    },
                    { type: 'paragraph', text: 'La fiche de signalement contient notamment :' },
                    {
                        type: 'list',
                        items: [
                            'les informations détaillées de l’objet ;',
                            'sa localisation ;',
                            'la parcelle concernée ;',
                            'les coordonnées GPS ;',
                            'les vues aériennes des différents millésimes ;',
                            'les éléments utiles à un contrôle terrain.',
                        ],
                    },
                    { type: 'paragraph', text: 'Il est possible de télécharger plusieurs fiches en même temps.' },
                ],
            },
            {
                id: 'a-quoi-servent-fiches-signalement',
                question: 'À quoi servent les fiches de signalement ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les fiches de signalement récapitulent les informations utiles pour préparer et réaliser une opération de terrain.',
                    },
                    { type: 'paragraph', text: 'Elles peuvent servir :' },
                    {
                        type: 'list',
                        items: [
                            'de support lors d’un contrôle ;',
                            'de document de préparation pour les agents ;',
                            'de pièce de contextualisation dans un dossier ;',
                            'd’annexe à un courrier ou à une procédure, sous réserve des pratiques du service.',
                        ],
                    },
                ],
            },
            {
                id: 'telecharger-plusieurs-fiches-signalement',
                question: 'Comment télécharger plusieurs fiches de signalement ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Téléchargement multiple de rapports** (icône de téléchargement), en haut à droite de la carte, puis :',
                    },
                    {
                        type: 'list',
                        items: [
                            'dessinez un polygone autour des objets : cliquez pour placer chaque point, puis double-cliquez pour terminer ;',
                            'la génération démarre aussitôt : patientez sans fermer la fenêtre.',
                        ],
                    },
                    { type: 'paragraph', text: 'Vous obtenez un seul fichier PDF, avec une page par objet.' },
                    {
                        type: 'note',
                        text: 'Seuls les objets affichés avec les filtres actifs sont pris en compte, dans la limite de 500 objets par sélection.',
                    },
                ],
            },
            {
                id: 'historique-parcelle-remise-en-etat',
                question:
                    'Je ne trouve plus de détection sur une parcelle remise en état. Comment retrouver son historique ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Lorsque toutes les détections d’une parcelle sont indiquées comme **Remises en état**, aucun objet actif ne s’affiche nécessairement sur la carte avec les filtres par défaut.',
                    },
                    { type: 'paragraph', text: 'L’historique peut toutefois rester accessible :' },
                    {
                        type: 'list',
                        items: [
                            'en activant les statuts correspondants dans les filtres, ou en choisissant le filtre rapide **Remis en état** ;',
                            'en cliquant sur la parcelle ;',
                            'en recherchant la commune, la section et le numéro de parcelle ;',
                            'en consultant les données historiques disponibles.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour retrouver l’historique d’une parcelle, utilisez en priorité la recherche par numéro de parcelle.',
                    },
                ],
            },
            {
                id: 'editer-courrier-prealable',
                question: 'Comment éditer un courrier préalable à une procédure pénale ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Ouvrez la fiche de l’objet, puis cliquez sur **Courrier préalable à la parcelle**.',
                    },
                    {
                        type: 'paragraph',
                        text: 'AIGLE génère un modèle de courrier modifiable (format .odt), pré-rempli à partir des informations de la parcelle, et passe automatiquement le statut de contrôle de l’objet à **Courrier préalable envoyé**.',
                    },
                    { type: 'paragraph', text: 'Complétez puis vérifiez toujours :' },
                    {
                        type: 'list',
                        items: [
                            'l’identité et l’adresse du destinataire ;',
                            'les références de la parcelle ;',
                            'les informations relatives à l’objet ;',
                            'le contenu juridique du courrier ;',
                            'les coordonnées du service émetteur.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour la rédaction et le suivi des procès-verbaux, référez-vous à LUCCA lorsque cet outil est disponible sur votre territoire.',
                    },
                ],
            },
        ],
    },
    {
        id: 'rechercher-adresse-parcelle-objet',
        title: 'Rechercher une adresse, une parcelle ou un objet',
        questions: [
            {
                id: 'chercher-parcelle-par-adresse',
                question: 'Comment chercher une parcelle à partir d’une adresse ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Saisissez l’adresse dans la barre **Rechercher par adresse**, en haut à gauche de la carte.',
                    },
                    {
                        type: 'paragraph',
                        text: 'La carte se recentre sur le secteur correspondant. Zoomez ensuite et activez la couche cadastrale pour identifier la parcelle.',
                    },
                ],
            },
            {
                id: 'chercher-parcelle-par-numero',
                question: 'Comment chercher une parcelle à partir de son numéro ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Rechercher une parcelle** (en haut à gauche de la carte), puis renseignez :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la commune : sélectionnez dans la liste le nom de la commune. Par exemple : « Mende » ;',
                            'la section cadastrale : n’inscrivez que la lettre (ou les deux lettres) et sélectionnez la proposition. Par exemple : « C » ;',
                            'le numéro de parcelle : par exemple « 334 ».',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Veillez à ne pas confondre la lettre **O** avec le chiffre **0**. Certains caractères ne sont pas acceptés dans les champs de recherche.',
                    },
                ],
            },
            {
                id: 'retrouver-objet-sans-numero-parcelle',
                question: 'Comment retrouver un objet signalé sans connaître son numéro de parcelle ?',
                answer: [
                    { type: 'paragraph', text: 'Ouvrez l’onglet **Tableau**, puis utilisez les filtres disponibles :' },
                    {
                        type: 'list',
                        items: [
                            'commune ou EPCI ;',
                            'type d’objet ;',
                            'statut de validation ;',
                            'statut de contrôle ;',
                            'zone à enjeux.',
                        ],
                    },
                    { type: 'paragraph', text: 'Vous pouvez également :' },
                    {
                        type: 'list',
                        items: [
                            'rechercher l’adresse approximative dans la barre **Rechercher par adresse** de la carte ;',
                            'naviguer directement sur la carte.',
                        ],
                    },
                ],
            },
            {
                id: 'recherche-adresse-ne-fonctionne-pas',
                question: 'La recherche par adresse ne fonctionne pas. Que faire ?',
                answer: [
                    { type: 'paragraph', text: 'Essayez de simplifier la recherche :' },
                    {
                        type: 'list',
                        items: [
                            'retirez le numéro de voie ;',
                            'recherchez uniquement le nom de la rue et la commune ;',
                            'vérifiez l’orthographe ;',
                            'utilisez une commune voisine ou un lieu-dit ;',
                            'recherchez directement la parcelle cadastrale ;',
                            'vérifiez que l’adresse se trouve dans un département de votre territoire : la recherche est limitée à celui-ci.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Si l’adresse est récente ou peu référencée, elle peut ne pas être reconnue par le service de localisation.',
                    },
                ],
            },
        ],
    },
    {
        id: 'selection-edition-multiples',
        title: 'Sélection et édition multiples',
        questions: [
            {
                id: 'selectionner-plusieurs-objets',
                question: 'Comment sélectionner plusieurs objets ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Cliquez sur **Édition multiple**, en haut à droite de la carte, puis dessinez un polygone autour des objets souhaités.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les objets affichés (selon les filtres actifs) présents dans cette zone sont sélectionnés automatiquement.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Depuis l’onglet **Tableau**, vous pouvez aussi activer **Édition multiple** et cocher les lignes à modifier.',
                    },
                    { type: 'note', text: 'La sélection est limitée à 500 objets.' },
                ],
            },
            {
                id: 'mettre-a-jour-plusieurs-objets',
                question: 'Comment mettre à jour plusieurs objets en même temps ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Après avoir sélectionné les objets avec l’outil **Édition multiple** :',
                    },
                    {
                        type: 'list',
                        items: [
                            'vérifiez le nombre d’objets sélectionnés ;',
                            'renseignez uniquement les champs que vous souhaitez modifier (les autres restent sur « Ne pas éditer ») ;',
                            'choisissez le type, le statut de validation ou le statut de contrôle ;',
                            'cliquez sur **Éditer les détections**.',
                        ],
                    },
                    {
                        type: 'note',
                        text: 'Vérifiez attentivement votre sélection avant de valider. La modification sera appliquée à l’ensemble des objets sélectionnés.',
                    },
                ],
            },
            {
                id: 'edition-multiple-nettoyer-donnees',
                question: 'Puis-je utiliser l’édition multiple pour nettoyer mes données ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Oui, à condition que les objets sélectionnés correspondent réellement à la même situation.',
                    },
                    {
                        type: 'paragraph',
                        text: 'L’édition multiple peut notamment permettre de faire passer plusieurs objets du statut **Non vérifié** au statut **Suspect** après leur vérification.',
                    },
                    { type: 'paragraph', text: 'Ne réalisez pas une modification groupée lorsque :' },
                    {
                        type: 'list',
                        items: [
                            'les objets n’ont pas tous été examinés ;',
                            'certains objets sont légaux ou invalidés ;',
                            'les parcelles présentent des situations différentes ;',
                            'vous n’êtes pas certain du statut à appliquer.',
                        ],
                    },
                ],
            },
            {
                id: 'annuler-modification-multiple',
                question: 'Puis-je annuler une modification multiple ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Si une modification multiple a été réalisée par erreur, commencez par corriger manuellement les objets concernés lorsque cela est possible.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Si le nombre d’objets est important ou si vous ne parvenez pas à identifier les données antérieures, contactez rapidement l’équipe AIGLE en précisant :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la date et l’heure approximatives de la modification ;',
                            'votre territoire ;',
                            'les objets ou parcelles concernés ;',
                            'les champs modifiés ;',
                            'le résultat attendu.',
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'connexion-compte-droits-acces',
        title: 'Connexion, compte et droits d’accès',
        questions: [
            {
                id: 'se-connecter-a-aigle',
                question: 'Comment me connecter à AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Rendez-vous sur :',
                    },
                    {
                        type: 'paragraph',
                        text: '[app.aigle.beta.gouv.fr](https://app.aigle.beta.gouv.fr)',
                    },
                    {
                        type: 'paragraph',
                        text: 'Saisissez les identifiants transmis lors de l’activation de votre compte, puis cliquez sur **Connexion**.',
                    },
                    { type: 'paragraph', text: 'Les navigateurs recommandés sont Chrome et Firefox.' },
                ],
            },
            {
                id: 'reinitialiser-mot-de-passe',
                question: 'Comment réinitialiser mon mot de passe ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Depuis la page de connexion, cliquez sur **Mot de passe oublié ?**, puis suivez les instructions reçues par courrier électronique.',
                    },
                    { type: 'paragraph', text: 'Pensez à vérifier votre dossier de courriers indésirables.' },
                ],
            },
            {
                id: 'message-reinitialisation-non-recu',
                question: 'Je ne reçois pas le message de réinitialisation. Que faire ?',
                answer: [
                    { type: 'paragraph', text: 'Vérifiez :' },
                    {
                        type: 'list',
                        items: [
                            'votre dossier de courriers indésirables ;',
                            'l’adresse électronique saisie ;',
                            'l’absence d’erreur dans votre adresse ;',
                            'les règles de sécurité de votre messagerie professionnelle.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Si vous ne recevez toujours rien, contactez l’équipe AIGLE en indiquant :',
                    },
                    {
                        type: 'list',
                        items: [
                            'votre nom ;',
                            'votre structure ;',
                            'l’adresse associée au compte ;',
                            'l’heure approximative de votre tentative.',
                        ],
                    },
                ],
            },
            {
                id: 'modifier-mon-profil',
                question: 'Comment modifier mon profil ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Vous ne pouvez pas modifier directement les informations de votre profil.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour changer votre mot de passe, utilisez la fonction **Mot de passe oublié ?** depuis la page de connexion.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour modifier une adresse électronique ou ajouter un utilisateur, vous devez passer par un administrateur ou une personne habilitée à valider les accès.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Votre administrateur peut contacter l’équipe AIGLE via le tchat ou à l’adresse [contact@aigle.beta.gouv.fr](mailto:contact@aigle.beta.gouv.fr) en précisant l’adresse électronique de la personne concernée.',
                    },
                ],
            },
            {
                id: 'ajouter-un-utilisateur',
                question: 'Comment ajouter un utilisateur ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'L’ajout d’un utilisateur est effectué sur demande par l’administrateur du territoire ou par l’équipe AIGLE.',
                    },
                    { type: 'paragraph', text: 'La demande doit préciser :' },
                    {
                        type: 'list',
                        items: [
                            'le nom et le prénom de l’utilisateur ;',
                            'son adresse électronique professionnelle ;',
                            'sa structure ;',
                            'sa fonction ;',
                            'le territoire auquel il doit accéder ;',
                            'le niveau de droits attendu.',
                        ],
                    },
                ],
            },
            {
                id: 'modifier-mes-droits-acces',
                question: 'Comment modifier mes droits d’accès ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les droits sont gérés par l’administrateur du territoire ou par l’équipe AIGLE.',
                    },
                    { type: 'paragraph', text: 'Indiquez :' },
                    {
                        type: 'list',
                        items: [
                            'votre identité ;',
                            'votre structure ;',
                            'le périmètre actuellement accessible ;',
                            'le périmètre souhaité ;',
                            'les fonctionnalités dont vous avez besoin ;',
                            'le motif de la demande.',
                        ],
                    },
                ],
            },
            {
                id: 'cloturer-mon-compte',
                question: 'Comment clôturer mon compte ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Envoyez votre demande à [contact@aigle.beta.gouv.fr](mailto:contact@aigle.beta.gouv.fr) en précisant :',
                    },
                    {
                        type: 'list',
                        items: [
                            'votre nom ;',
                            'votre structure ;',
                            'votre territoire ;',
                            'l’adresse électronique associée au compte.',
                        ],
                    },
                ],
            },
            {
                id: 'pourquoi-nettoyer-les-donnees',
                question: 'Pourquoi faut-il nettoyer les données avant de les utiliser ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les objets non vérifiés, les erreurs de détection et les statuts incorrects peuvent fausser :',
                    },
                    {
                        type: 'list',
                        items: [
                            'les statistiques ;',
                            'les priorités de contrôle ;',
                            'le nombre d’objets réellement suspects ;',
                            'le suivi des actions ;',
                            'la mesure des remises en état.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le nettoyage consiste notamment à faire passer les objets **Non vérifiés** :',
                    },
                    {
                        type: 'list',
                        items: [
                            'en **Suspect** lorsqu’ils correspondent bien à une situation à analyser ;',
                            'en **Invalidé** lorsqu’il s’agit d’une erreur de détection ;',
                            'en **Légal** lorsqu’une autorisation ou un élément établissant leur régularité a été identifié.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'La validation régulière des détections améliore la fiabilité de la carte et facilite le travail de l’ensemble des utilisateurs du territoire.',
                    },
                ],
            },
            {
                id: 'acceder-territoire-ddtm-epci',
                question: 'Comment accéder à l’intégralité de mon territoire en tant que DDT(M) ou EPCI ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'L’accès à un périmètre départemental ou intercommunal dépend de la configuration du déploiement et des droits attribués à votre structure.',
                    },
                    { type: 'paragraph', text: 'Contactez l’équipe AIGLE en précisant :' },
                    {
                        type: 'list',
                        items: [
                            'votre structure ;',
                            'votre fonction ;',
                            'le territoire concerné ;',
                            'les communes auxquelles vous devez accéder ;',
                            'l’usage prévu.',
                        ],
                    },
                ],
            },
            {
                id: 'acceder-a-ma-commune',
                question: 'Comment accéder à ma commune ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Rapprochez-vous de votre DDT(M) référente ou de l’administrateur AIGLE de votre territoire.',
                    },
                    { type: 'paragraph', text: 'L’ouverture d’un accès communal dépend notamment :' },
                    {
                        type: 'list',
                        items: [
                            'du déploiement d’AIGLE sur le territoire ;',
                            'des modalités de partenariat retenues ;',
                            'de la convention ou du cadre d’utilisation applicable ;',
                            'de la création du compte et de l’attribution des droits.',
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'utilisation-sur-le-terrain',
        title: 'Utilisation sur le terrain',
        questions: [
            {
                id: 'utiliser-sur-tablette-ou-mobile',
                question: 'Peut-on utiliser AIGLE sur tablette ou sur mobile ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Oui. L’interface peut être utilisée sur tablette ou sur téléphone mobile.',
                    },
                    { type: 'paragraph', text: 'Elle permet notamment, lors d’un contrôle :' },
                    {
                        type: 'list',
                        items: [
                            'de consulter une parcelle ;',
                            'de localiser un objet ou de se localiser ;',
                            'd’accéder à la fiche de signalement ;',
                            'de modifier certains statuts ;',
                            'd’ajouter des commentaires.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour une utilisation confortable et complète, l’ordinateur ou la tablette restent généralement recommandés.',
                    },
                ],
            },
            {
                id: 'utiliser-sans-connexion-internet',
                question: 'Peut-on utiliser AIGLE sans connexion internet ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE nécessite normalement une connexion internet pour afficher les données et enregistrer les modifications.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Avant un contrôle dans une zone peu couverte, il est recommandé de télécharger les fiches de signalement utiles.',
                    },
                    { type: 'paragraph', text: 'Une utilisation hors connexion complète n’est pas garantie.' },
                ],
            },
            {
                id: 'integrer-images-drone',
                question: 'Peut-on intégrer des images prises par un drone dans AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Il n’est actuellement pas possible d’injecter directement des images prises par un drone dans AIGLE afin de les afficher comme un nouveau millésime ou de les faire analyser par l’algorithme.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les photographies ou vidéos prises par drone peuvent néanmoins être utilisées en dehors d’AIGLE comme éléments complémentaires dans un rapport de constatation, notamment lorsqu’il n’est pas possible d’entrer dans une propriété.',
                    },
                    { type: 'paragraph', text: 'Leur utilisation doit respecter :' },
                    {
                        type: 'list',
                        items: [
                            'les règles applicables au pilotage des drones ;',
                            'les autorisations nécessaires ;',
                            'le droit au respect de la vie privée ;',
                            'les règles de procédure du service ;',
                            'les conditions de recevabilité et de conservation des éléments recueillis.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'En cas de doute, rapprochez-vous du référent juridique ou du service compétent avant d’utiliser ces images dans une procédure.',
                    },
                ],
            },
        ],
    },
    {
        id: 'acces-collectivites-perimetre',
        title: 'Accès des collectivités et périmètre d’AIGLE',
        questions: [
            {
                id: 'aigle-accessible-aux-collectivites',
                question: 'AIGLE est-il accessible directement aux collectivités ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE peut être mis à disposition des collectivités dans les territoires où le dispositif est déployé et lorsque les conditions d’accès sont réunies.',
                    },
                    {
                        type: 'paragraph',
                        text: 'La DDT(M) reste généralement l’interlocutrice principale pour :',
                    },
                    {
                        type: 'list',
                        items: [
                            'présenter l’outil ;',
                            'accompagner les communes ;',
                            'organiser le déploiement ;',
                            'attribuer ou demander les accès ;',
                            'structurer la stratégie territoriale.',
                        ],
                    },
                    { type: 'paragraph', text: 'Les modalités précises peuvent varier selon le territoire.' },
                ],
            },
            {
                id: 'couverture-zones-urbaines',
                question: 'AIGLE couvrira-t-il les zones urbaines ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'À ce jour, AIGLE est principalement consacré aux zones naturelles, agricoles et forestières.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Les zones urbaines ne font pas partie du périmètre prioritaire de détection.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Une extension à d’autres types de zones peut être envisagée dans le cadre des évolutions futures sur les zones à risques uniquement. L’équipe travaille toutefois prioritairement sur d’autres usages et améliorations d’AIGLE, notamment :',
                    },
                    {
                        type: 'list',
                        items: [
                            'la détection de nouveaux types d’objets ;',
                            'l’amélioration de la surveillance des espaces naturels et forestiers ;',
                            'l’identification de situations pouvant aggraver les risques de feu ;',
                            'le suivi des remblais et des dépôts de déchets ;',
                            'les alertes lors de nouvelles détections.',
                        ],
                    },
                ],
            },
            {
                id: 'suivre-remblais-depots-dechets',
                question: 'Peut-on suivre les remblais et les dépôts de déchets dans AIGLE ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les remblais, dépôts de déchets et installations assimilées peuvent parfois apparaître dans la catégorie **Autres**.',
                    },
                    {
                        type: 'paragraph',
                        text: 'La reconnaissance automatique de ces objets n’est pas encore systématique ni totalement fiabilisée.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Lorsqu’un remblai ou un dépôt est identifié sur le terrain ou sur une photographie, vous pouvez :',
                    },
                    {
                        type: 'list',
                        items: [
                            'ouvrir la fiche de l’objet ;',
                            'modifier son type ;',
                            'sélectionner **Remblai** dans la liste déroulante lorsque ce type est disponible ;',
                            'ajouter un commentaire pour décrire la situation.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Si aucun objet n’a été détecté, vous pouvez également l’ajouter manuellement sur la carte.',
                    },
                ],
            },
        ],
    },
    {
        id: 'historique-actions-lucca',
        title: 'Historique des actions et articulation avec LUCCA',
        questions: [
            {
                id: 'historique-complet-actions-parcelle',
                question: 'Peut-on consulter l’historique complet des actions menées sur une parcelle ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE permet de conserver plusieurs informations relatives aux objets, aux statuts et aux détections successives.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Toutefois, l’ensemble des actions administratives et judiciaires menées sur une parcelle n’est pas nécessairement retracé de manière complète dans AIGLE.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Pour un suivi détaillé des procédures, des procès-verbaux et des échanges associés, utilisez LUCCA lorsque cet outil est disponible.',
                    },
                ],
            },
            {
                id: 'importer-historique-anciens-pv',
                question: 'Peut-on importer dans AIGLE ou LUCCA l’historique des anciens PV ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Il n’est actuellement pas possible pour un utilisateur d’importer directement un fichier Excel ou CSV contenant les anciens PV afin de reconstituer automatiquement l’historique dans AIGLE ou LUCCA.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Une reprise de l’historique peut toutefois être étudiée avec les équipes AIGLE et LUCCA.',
                    },
                    { type: 'paragraph', text: 'Cette reprise nécessiterait notamment :' },
                    {
                        type: 'list',
                        items: [
                            'de définir les informations à reprendre ;',
                            'd’utiliser un format de fichier standardisé ;',
                            'de nettoyer et mettre en forme les données existantes ;',
                            'de vérifier les références des communes et parcelles ;',
                            'd’identifier les doublons ;',
                            'de définir dans quel outil chaque information doit être intégrée.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'Le territoire devra probablement préparer et formater ses données à partir d’un modèle fourni par l’équipe.',
                    },
                ],
            },
            {
                id: 'difference-aigle-lucca',
                question: 'Quelle est la différence entre AIGLE et LUCCA ?',
                answer: [
                    { type: 'paragraph', text: 'AIGLE permet principalement :' },
                    {
                        type: 'list',
                        items: [
                            'd’identifier les installations ou constructions potentiellement illégales ;',
                            'de visualiser leur évolution sur les photographies aériennes ;',
                            'de préparer et prioriser les contrôles ;',
                            'de suivre les principales étapes de traitement ;',
                            'de générer des fiches de signalement et certains courriers.',
                        ],
                    },
                    { type: 'paragraph', text: 'LUCCA permet principalement :' },
                    {
                        type: 'list',
                        items: [
                            'd’accompagner la rédaction des procès-verbaux ;',
                            'de structurer les informations nécessaires à la procédure ;',
                            'd’améliorer la qualité et la complétude des PV ;',
                            'de suivre les dossiers et leur avancement dans le temps ;',
                            'de gérer des informations nominatives ou sensibles dans un cadre plus adapté au suivi des procédures.',
                        ],
                    },
                    { type: 'paragraph', text: 'Les deux outils sont complémentaires.' },
                ],
            },
        ],
    },
    {
        id: 'donnees-personnelles-sensibles',
        title: 'Données personnelles et données sensibles',
        questions: [
            {
                id: 'donnees-personnelles-dans-aigle',
                question: 'AIGLE contient-il des données personnelles ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'AIGLE contient principalement des données géographiques, cadastrales et des informations relatives aux objets détectés.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Certaines données, comme une adresse, des coordonnées géographiques ou une référence cadastrale, peuvent toutefois permettre d’identifier indirectement une personne physique et doivent donc être traitées avec précaution.',
                    },
                    {
                        type: 'paragraph',
                        text: 'Évitez d’inscrire dans les commentaires AIGLE des informations personnelles qui ne sont pas nécessaires au traitement du dossier.',
                    },
                ],
            },
            {
                id: 'enregistrer-donnees-nominatives-sensibles',
                question: 'Où doivent être enregistrées les données nominatives ou sensibles ?',
                answer: [
                    {
                        type: 'paragraph',
                        text: 'Les données nominatives, les informations sur les personnes mises en cause et les éléments sensibles liés à une procédure ont davantage vocation à être gérés dans LUCCA ou dans les outils métier prévus à cet effet.',
                    },
                    { type: 'paragraph', text: 'LUCCA est mieux adapté pour :' },
                    {
                        type: 'list',
                        items: [
                            'le suivi détaillé des dossiers ;',
                            'la rédaction des PV ;',
                            'la gestion des informations nominatives ;',
                            'la traçabilité des procédures ;',
                            'la mise en œuvre des obligations liées au RGPD et aux échanges avec la CNIL.',
                        ],
                    },
                    {
                        type: 'paragraph',
                        text: 'AIGLE doit rester principalement centré sur la détection, la qualification des objets, la préparation des contrôles et le pilotage territorial.',
                    },
                ],
            },
        ],
    },
];
