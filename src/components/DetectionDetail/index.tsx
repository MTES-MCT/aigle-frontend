import { detectionEndpoints } from '@/api/endpoints';
import DetectionDetailDetectionData from '@/components/DetectionDetail/DetectionDetailDetectionData';
import DetectionDetailDetectionObject from '@/components/DetectionDetail/DetectionDetailDetectionObject';
import DetectionTileHistory from '@/components/DetectionDetail/DetectionTileHistory';
import PanelHeader from '@/components/DetectionDetail/PanelHeader';
import {
    consumeDetectionObjectOpened,
    getDetectionObjectBlockers,
    useDetectionTracking,
} from '@/components/DetectionDetail/tracking';
import { getFiltersToMakeVisible, getForceVisibleTrackingName } from '@/components/DetectionDetail/utils/force-visible';
import Accordion from '@/components/dsfr/Accordion';
import Tooltip from '@/components/dsfr/Tooltip';
import SignalementPDFData, { SignalementFailureReason } from '@/components/signalement-pdf/SignalementPDFData';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { useDetectionAddress, useDetectionObjectDetail, usePriorLetterDownload } from '@/hooks';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import api, { ApiError } from '@/utils/api';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATETIME_FORMAT } from '@/utils/constants';
import { formatCommune, formatDateOnly, formatGeoCustomZonesWithSubZones, formatParcel } from '@/utils/format';
import { getDetectionObjectLink } from '@/utils/link';
import { getErrorTrackingName, SignalementSource, TRACKING_CATEGORIES } from '@/utils/tracking';
import { notifications } from '@mantine/notifications';
import { centroid } from '@turf/turf';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Position } from 'geojson';
import React, { useEffect, useRef, useState } from 'react';
import classes from './index.module.scss';

type SignalementPDFType = 'detectionObject' | 'parcel';

const getGoogleMapLink = (point: Position) => `https://www.google.com/maps/?t=k&q=${point[1]},${point[0]}`;

const getLoadErrorMessage = (error: Error) => {
    if (error instanceof ApiError && error.status === 404) {
        return "Cet objet n'existe pas ou a été supprimé.";
    }

    if (error instanceof ApiError && error.status === 403) {
        return "Vous n'avez pas accès à cet objet.";
    }

    return "L'objet n'a pas pu être chargé, veuillez réessayer.";
};

interface ComponentInnerProps {
    detectionObject: DetectionObjectDetail;
    detectionObjectRefreshing: boolean;
    detectionUuid?: string;
    detectionHidden?: boolean;
    setDetectionUnhidden?: () => void;
    onClose: () => void;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    detectionObject,
    detectionObjectRefreshing,
    detectionUuid,
    detectionHidden,
    setDetectionUnhidden,
    onClose,
}) => {
    const { eventEmitter } = useMap();
    const { objectsFilter, updateObjectsFilter } = useObjectsFilter();
    const { trackEvent } = useDetectionTracking();
    const [signalementPdfGenerating, setSignalementPdfGenerating] = useState<SignalementPDFType | undefined>();
    const [forceVisibleLoading, setForceVisibleLoading] = useState(false);
    const [generalInformationsExpanded, setGeneralInformationsExpanded] = useState(false);
    // read by the outcome of the generation the agent launched
    const signalementRunRef = useRef<{ source: SignalementSource; startedAt: number } | null>(null);

    const { address, isLoading: isAddressLoading } = useDetectionAddress(detectionObject);
    const { downloadPriorLetter, isDownloading } = usePriorLetterDownload();

    const initialDetection =
        detectionObject.detections.find((detection) => detection.uuid === detectionUuid) ||
        detectionObject.detections[0];
    const [tileSetSelected, setTileSetSelected] = useState<TileSet>(initialDetection.tileSet);

    const {
        geometry: { coordinates: centerPoint },
    } = centroid(initialDetection.geometry);

    const latLong = `${centerPoint[1].toFixed(5)}, ${centerPoint[0].toFixed(5)}`;

    useEffect(() => {
        if (!consumeDetectionObjectOpened(detectionObject.uuid)) {
            return;
        }

        const blockers = getDetectionObjectBlockers(detectionObject, initialDetection);

        if (blockers.length) {
            trackEvent(TRACKING_CATEGORIES.detection, 'Fiche bloquée', blockers.join(' + '));
        }
    }, [detectionObject.uuid]);

    const startSignalement = (type: SignalementPDFType, source: SignalementSource) => {
        signalementRunRef.current = { source, startedAt: Date.now() };
        trackEvent(TRACKING_CATEGORIES.signalement, 'Génération lancée', source, 1);
        setSignalementPdfGenerating(type);
    };

    const finishSignalement = (error?: string, failureReason?: SignalementFailureReason) => {
        const run = signalementRunRef.current;
        signalementRunRef.current = null;

        if (error) {
            notifications.show({
                title: 'Erreur lors de la génération de la fiche de signalement',
                message: error,
                color: 'red',
            });
        }

        if (run && error) {
            trackEvent(
                TRACKING_CATEGORIES.signalement,
                'Génération échouée',
                `${run.source} : ${failureReason ?? 'Erreur de génération'}`,
            );
        } else if (run) {
            trackEvent(
                TRACKING_CATEGORIES.signalement,
                'Fiche téléchargée',
                run.source,
                Math.round((Date.now() - run.startedAt) / 1000),
            );
        }

        setSignalementPdfGenerating(undefined);
    };

    const selectTileSetFromHistory = (tileSet: TileSet) => {
        if (tileSet.uuid !== tileSetSelected.uuid) {
            trackEvent(
                TRACKING_CATEGORIES.detection,
                'Millésime sélectionné',
                `Historique : ${formatDateOnly(tileSet.date, 'yyyy')}`,
            );
        }

        setTileSetSelected(tileSet);
    };

    const copyLink = () => {
        navigator.clipboard
            .writeText(getDetectionObjectLink(detectionObject.uuid, true))
            .then(() => {
                notifications.show({
                    title: 'Lien copié dans le presse-papier',
                    message: "Le lien vers l'objet détecté a été copié dans le presse-papier",
                });
                trackEvent(TRACKING_CATEGORIES.detection, 'Lien copié');
            })
            .catch(() =>
                notifications.show({
                    color: 'red',
                    title: "Le lien n'a pas pu être copié",
                    message: "Le presse-papier n'est pas accessible depuis ce navigateur",
                }),
            );
    };

    const makeVisible = async () => {
        if (!objectsFilter) {
            return;
        }

        const newFilters = getFiltersToMakeVisible(objectsFilter, detectionObject, detectionObject.detections[0]);
        updateObjectsFilter(newFilters);
        trackEvent(
            TRACKING_CATEGORIES.detection,
            'Détection rendue visible',
            getForceVisibleTrackingName(objectsFilter, newFilters),
        );

        notifications.show({
            title: 'Filtres mis à jour',
            message: 'Les filtres ont été mis à jour pour rendre la détection visible',
        });

        setForceVisibleLoading(true);
        try {
            await api(detectionEndpoints.forceVisible(detectionObject.detections[0].uuid), {
                method: 'PATCH',
            });
        } catch (error) {
            console.error(error);
            notifications.show({
                color: 'red',
                title: 'Erreur',
                message: "La détection n'a pas pu être rendue visible, veuillez réessayer.",
            });
            return;
        } finally {
            setForceVisibleLoading(false);
        }
        setDetectionUnhidden && setDetectionUnhidden();
    };

    const signalementDisabled = !detectionObject.parcel?.uuid || !!signalementPdfGenerating;

    return (
        <div className={classes.container}>
            <PanelHeader
                title={`Objet détecté #${detectionObject.id}`}
                onClose={onClose}
                actions={
                    <Tooltip label="Copier le lien vers l'objet">
                        <button
                            type="button"
                            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-links-line"
                            onClick={copyLink}
                        >
                            Copier le lien vers l&apos;objet
                        </button>
                    </Tooltip>
                }
            />

            <div className={classes.section}>
                <p className={classes['actions-label']}>Fiches de signalement</p>
                <div className={classes['actions-row']}>
                    <Tooltip label="Télécharger la fiche de signalement à l'objet">
                        <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-file-download-line"
                            disabled={signalementDisabled}
                            aria-busy={signalementPdfGenerating === 'detectionObject'}
                            onClick={() => {
                                notifications.show({
                                    title: "Génération de la fiche de signalement à l'objet en cours",
                                    message: 'Le téléchargement se lancera dans quelques instants',
                                });
                                startSignalement('detectionObject', 'Fiche objet');
                            }}
                        >
                            A l&apos;objet
                        </button>
                    </Tooltip>
                    <Tooltip label="Télécharger la fiche de signalement à la parcelle">
                        <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-road-map-line"
                            disabled={signalementDisabled}
                            aria-busy={signalementPdfGenerating === 'parcel'}
                            onClick={() => {
                                notifications.show({
                                    title: 'Génération de la fiche de signalement à la parcelle en cours',
                                    message: 'Le téléchargement se lancera dans quelques instants',
                                });
                                startSignalement('parcel', 'Fiche parcelle');
                            }}
                        >
                            A la parcelle
                        </button>
                    </Tooltip>
                </div>
                {!!signalementPdfGenerating ? (
                    <SignalementPDFData
                        previewParams={[
                            {
                                parcelUuid: String(detectionObject.parcel?.uuid),
                                detectionObjectUuid:
                                    signalementPdfGenerating === 'detectionObject'
                                        ? String(detectionObject.uuid)
                                        : undefined,
                            },
                        ]}
                        onGenerationFinished={finishSignalement}
                    />
                ) : null}

                <div className={classes['actions-row']}>
                    <Tooltip label="Télécharger le courrier préalable à la parcelle">
                        <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-mail-download-line"
                            disabled={!detectionObject.parcel?.uuid || isDownloading}
                            aria-busy={isDownloading}
                            onClick={async () => {
                                // the backend moves the object to PRIOR_LETTER_SENT on download
                                const controlStatusBeforeDownload =
                                    initialDetection.detectionData.detectionControlStatus;

                                // a fiche already generating keeps going, under its own source
                                if (!signalementPdfGenerating) {
                                    startSignalement('parcel', 'Courrier préalable');
                                }

                                try {
                                    await downloadPriorLetter(detectionObject.uuid);
                                } catch {
                                    // usePriorLetterDownload has notified the user
                                    return;
                                }

                                trackEvent(
                                    TRACKING_CATEGORIES.signalement,
                                    'Courrier préalable téléchargé',
                                    controlStatusBeforeDownload,
                                );
                                eventEmitter.emit('UPDATE_DETECTION_DETAIL');
                            }}
                        >
                            Courrier préalable à la parcelle
                        </button>
                    </Tooltip>
                </div>

                <div className={classes['actions-row']}>
                    <Tooltip label="Ouvrir dans Google Maps">
                        <a
                            // link tracking would log the coordinates of the property as an outlink
                            className="fr-btn fr-btn--tertiary fr-btn--sm fr-btn--icon-left fr-icon-map-pin-2-line matomo_ignore"
                            href={getGoogleMapLink(centerPoint)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="GMaps - nouvelle fenêtre"
                            onClick={() => trackEvent(TRACKING_CATEGORIES.detection, 'Google Maps ouvert', 'Bouton')}
                        >
                            GMaps
                        </a>
                    </Tooltip>
                </div>

                {detectionHidden ? (
                    <div className={clsx('fr-alert fr-alert--warning', classes.alert)}>
                        <h3 className="fr-alert__title">Détection cachée</h3>
                        <p>Cette détection est cachée par les filtres actuels.</p>
                        <p>Appuyez sur le bouton ci-dessous pour forcer son affichage</p>
                        <button
                            type="button"
                            className={clsx('fr-btn fr-btn--sm', classes['alert-action'])}
                            disabled={forceVisibleLoading}
                            aria-busy={forceVisibleLoading}
                            onClick={makeVisible}
                        >
                            Rendre visible
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="fr-accordions-group">
                <Accordion
                    title="Informations générales"
                    expanded={generalInformationsExpanded}
                    onToggle={setGeneralInformationsExpanded}
                >
                    <ul className={classes['informations']}>
                        <li className={classes['informations-item']}>
                            <span className="fr-icon-home-4-line fr-icon--sm" aria-hidden="true" />
                            <span>
                                <span className={classes['informations-text']}>
                                    {address ? (
                                        address
                                    ) : (
                                        <>
                                            {isAddressLoading || address === undefined ? (
                                                <i>Chargement de l&apos;adresse...</i>
                                            ) : (
                                                <i>Adresse non-spécifiée</i>
                                            )}
                                        </>
                                    )}
                                </span>
                                {detectionObject.parcel ? (
                                    <span className={classes['informations-text-mention']}>
                                        {formatCommune(detectionObject.parcel.commune)}
                                    </span>
                                ) : null}
                            </span>
                        </li>
                        <li className={classes['informations-item']}>
                            <span className="fr-icon-calendar-line fr-icon--sm" aria-hidden="true" />
                            <span>
                                Dernière mise à jour :{' '}
                                {detectionObject.userGroupLastUpdate ? (
                                    <b>{detectionObject.userGroupLastUpdate.name}</b>
                                ) : (
                                    <OptionalText emptyText="Aucun groupe" />
                                )}
                                <br />
                                <Tooltip label={format(detectionObject.updatedAt, DEFAULT_DATETIME_FORMAT)}>
                                    <span tabIndex={0}>{format(detectionObject.updatedAt, DEFAULT_DATE_FORMAT)}</span>
                                </Tooltip>
                            </span>
                        </li>
                        <li className={classes['informations-item']}>
                            <span className="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true" />
                            <a
                                className="fr-link fr-link--sm matomo_ignore"
                                href={getGoogleMapLink(centerPoint)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${latLong} - nouvelle fenêtre`}
                                onClick={() =>
                                    trackEvent(TRACKING_CATEGORIES.detection, 'Google Maps ouvert', 'Coordonnées')
                                }
                            >
                                {latLong}
                            </a>
                        </li>
                        <li className={classes['informations-item']}>
                            <span className="fr-icon-road-map-line fr-icon--sm" aria-hidden="true" />
                            <span>
                                {detectionObject.parcel ? (
                                    <>
                                        Parcelle :{' '}
                                        <button
                                            type="button"
                                            className="fr-link fr-link--sm"
                                            onClick={() =>
                                                eventEmitter.emit('DISPLAY_PARCEL', detectionObject.parcel.geometry)
                                            }
                                        >
                                            {formatParcel(detectionObject.parcel)}
                                        </button>
                                    </>
                                ) : (
                                    <i>Parcelle non-spécifiée</i>
                                )}
                            </span>
                        </li>
                        <li className={classes['informations-item']}>
                            <span className="fr-icon-hexagon-line fr-icon--sm" aria-hidden="true" />
                            <span>
                                {detectionObject.geoCustomZones.length ? (
                                    <>
                                        Zones à enjeux :{' '}
                                        {formatGeoCustomZonesWithSubZones(detectionObject.geoCustomZones)}
                                    </>
                                ) : (
                                    <i>Aucune zone à enjeux associée</i>
                                )}
                            </span>
                        </li>
                    </ul>
                </Accordion>
            </div>

            <DetectionDetailDetectionObject detectionObject={detectionObject} />

            <div className="fr-accordions-group">
                <DetectionDetailDetectionData
                    detectionObject={detectionObject}
                    detectionRefreshing={detectionObjectRefreshing}
                    initialDetection={initialDetection}
                    tileSetSelected={tileSetSelected}
                    setTileSetSelected={setTileSetSelected}
                />
                <DetectionTileHistory detectionObject={detectionObject} setTileSetSelected={selectTileSetFromHistory} />
            </div>
        </div>
    );
};

interface ComponentProps {
    detectionObjectUuid: string;
    detectionUuid?: string;
    detectionHidden?: boolean;
    setDetectionUnhidden?: () => void;
    onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({
    detectionObjectUuid,
    detectionUuid,
    detectionHidden = false,
    setDetectionUnhidden,
    onClose,
}: ComponentProps) => {
    const {
        detectionObject,
        isRefetching: detectionObjectRefreshing,
        isLoading,
        error,
    } = useDetectionObjectDetail(detectionObjectUuid);
    const { trackEvent } = useDetectionTracking();

    useEffect(() => {
        if (!error || detectionObject || !consumeDetectionObjectOpened(detectionObjectUuid)) {
            return;
        }

        trackEvent(
            TRACKING_CATEGORIES.detection,
            'Fiche bloquée',
            `Erreur de chargement : ${getErrorTrackingName(error)}`,
        );
    }, [error]);

    if (!detectionObject && error) {
        return (
            <div className={classes.container}>
                <PanelHeader title="Objet détecté" onClose={onClose} />
                <div className={classes.section}>
                    <div className={clsx('fr-alert fr-alert--error', classes.alert)}>
                        <h3 className="fr-alert__title">Objet inaccessible</h3>
                        <p>{getLoadErrorMessage(error)}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || !detectionObject) {
        return <Loader className={classes.loader} />;
    }

    return (
        <ComponentInner
            detectionHidden={detectionHidden}
            detectionObject={detectionObject}
            detectionObjectRefreshing={detectionObjectRefreshing}
            detectionUuid={detectionUuid}
            setDetectionUnhidden={setDetectionUnhidden}
            onClose={onClose}
        />
    );
};

export default Component;
