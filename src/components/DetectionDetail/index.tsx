import { detectionEndpoints } from '@/api/endpoints';
import DetectionDetailDetectionData from '@/components/DetectionDetail/DetectionDetailDetectionData';
import DetectionDetailDetectionObject from '@/components/DetectionDetail/DetectionDetailDetectionObject';
import DetectionTileHistory from '@/components/DetectionDetail/DetectionTileHistory';
import {
    consumeDetectionObjectOpened,
    getDetectionObjectBlockers,
    useDetectionTracking,
} from '@/components/DetectionDetail/tracking';
import { getFiltersToMakeVisible, getForceVisibleTrackingName } from '@/components/DetectionDetail/utils/force-visible';
import SignalementPDFData, { SignalementFailureReason } from '@/components/signalement-pdf/SignalementPDFData';
import DateInfo from '@/components/ui/DateInfo';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import WarningCard from '@/components/ui/WarningCard';
import { useDetectionAddress, useDetectionObjectDetail, usePriorLetterDownload } from '@/hooks';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import api, { ApiError } from '@/utils/api';
import { formatCommune, formatDateOnly, formatGeoCustomZonesWithSubZones, formatParcel } from '@/utils/format';
import { getDetectionObjectLink } from '@/utils/link';
import { getErrorTrackingName, SignalementSource, TRACKING_CATEGORIES } from '@/utils/tracking';
import { Accordion, ActionIcon, Anchor, Button, Loader as MantineLoader, ScrollArea, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCalendarClock,
    IconDownload,
    IconHexagon,
    IconMailDown,
    IconMap,
    IconMapDown,
    IconMapPin,
    IconMapPinFilled,
    IconRoute,
    IconShare2,
    IconX,
} from '@tabler/icons-react';
import { centroid } from '@turf/turf';
import clsx from 'clsx';
import { Position } from 'geojson';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

    return (
        <ScrollArea scrollbars="y" offsetScrollbars={true} classNames={{ root: classes.container }}>
            <div className={classes.inner}>
                <div className={classes['top-section']}>
                    <h1>
                        Objet détecté{' '}
                        <Anchor
                            onClick={() => {
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
                            }}
                            component="button"
                        >
                            <h1>
                                #{detectionObject.id} <IconShare2 />
                            </h1>
                        </Anchor>
                    </h1>

                    {onClose ? (
                        <ActionIcon variant="transparent" onClick={onClose} aria-label="Fermer le détail de détection">
                            <IconX />
                        </ActionIcon>
                    ) : null}
                </div>

                <div>
                    <p className="input-label">Fiches de signalement</p>
                    <Button.Group>
                        <Tooltip label="Télécharger la fiche de signalement à l'objet" position="bottom-start">
                            <Button
                                fullWidth
                                variant="outline"
                                disabled={!detectionObject.parcel?.uuid || !!signalementPdfGenerating}
                                size="xs"
                                onClick={() => {
                                    notifications.show({
                                        title: "Génération de la fiche de signalement à l'objet en cours",
                                        message: 'Le téléchargement se lancera dans quelques instants',
                                    });
                                    startSignalement('detectionObject', 'Fiche objet');
                                }}
                                loading={signalementPdfGenerating === 'detectionObject'}
                                leftSection={<IconDownload size={20} />}
                            >
                                A l&apos;objet
                            </Button>
                        </Tooltip>
                        <Tooltip label="Télécharger la fiche de signalement à la parcelle" position="bottom-start">
                            <Button
                                fullWidth
                                variant="outline"
                                disabled={!detectionObject.parcel?.uuid || !!signalementPdfGenerating}
                                size="xs"
                                onClick={() => {
                                    notifications.show({
                                        title: 'Génération de la fiche de signalement à la parcelle en cours',
                                        message: 'Le téléchargement se lancera dans quelques instants',
                                    });
                                    startSignalement('parcel', 'Fiche parcelle');
                                }}
                                loading={signalementPdfGenerating === 'parcel'}
                                leftSection={<IconMapDown size={20} />}
                            >
                                A la parcelle
                            </Button>
                        </Tooltip>
                    </Button.Group>
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
                </div>
                <Tooltip label="Télécharger le courrier préalable à la parcelle" position="bottom-start">
                    <Button
                        fullWidth
                        variant="outline"
                        disabled={!detectionObject.parcel?.uuid || isDownloading}
                        size="xs"
                        onClick={async () => {
                            // the backend moves the object to PRIOR_LETTER_SENT on download
                            const controlStatusBeforeDownload = initialDetection.detectionData.detectionControlStatus;

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
                        loading={isDownloading}
                        leftSection={<IconMailDown size={20} />}
                    >
                        Courrier préalable à la parcelle
                    </Button>
                </Tooltip>

                <Tooltip label="Ouvrir dans Google Maps" position="bottom-start">
                    <Button
                        variant="light"
                        component={Link}
                        size="xs"
                        leftSection={<IconMapPinFilled size={20} />}
                        to={getGoogleMapLink(centerPoint)}
                        target="_blank"
                        // link tracking would log the coordinates of the property as an outlink
                        className="matomo_ignore"
                        onClick={() => trackEvent(TRACKING_CATEGORIES.detection, 'Google Maps ouvert', 'Bouton')}
                    >
                        GMaps
                    </Button>
                </Tooltip>

                {detectionHidden ? (
                    <WarningCard title="Détection cachée">
                        <p>Cette détection est cachée par les filtres actuels.</p>
                        <p>Appuyez sur le bouton ci-dessous pour forcer son affichage</p>
                        <Button
                            mt="md"
                            color="orange"
                            fullWidth
                            onClick={async () => {
                                if (!objectsFilter) {
                                    return;
                                }

                                const newFilters = getFiltersToMakeVisible(
                                    objectsFilter,
                                    detectionObject,
                                    detectionObject.detections[0],
                                );
                                updateObjectsFilter(newFilters);
                                eventEmitter.emit('OBJECTS_FILTER_UPDATED', newFilters);
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
                            }}
                            disabled={forceVisibleLoading}
                        >
                            Rendre visible
                        </Button>
                    </WarningCard>
                ) : null}

                <Accordion variant="contained" className={classes['general-informations']} defaultValue={undefined}>
                    <Accordion.Item key="infos" value="infos" className={classes['general-informations-item']}>
                        <Accordion.Control>Informations générales</Accordion.Control>
                        <Accordion.Panel className={classes['general-informations-content']}>
                            <p className={classes['general-informations-content-item']}>
                                <IconRoute size={16} className={classes['general-informations-content-item-icon']} />
                                <span>
                                    <span className={classes['general-informations-content-item-text']}>
                                        {address ? (
                                            address
                                        ) : (
                                            <>
                                                {isAddressLoading || address === undefined ? (
                                                    <>
                                                        <i>Chargement de l&apos;adresse...</i>
                                                        <MantineLoader ml="xs" size="xs" />
                                                    </>
                                                ) : (
                                                    <i>Adresse non-spécifiée</i>
                                                )}
                                            </>
                                        )}
                                    </span>
                                    <span
                                        className={clsx(
                                            classes['general-informations-content-item-text'],
                                            classes['general-informations-content-item-text-grey'],
                                        )}
                                    >
                                        {detectionObject.parcel ? (
                                            <>{formatCommune(detectionObject.parcel.commune)}</>
                                        ) : null}
                                    </span>
                                </span>
                            </p>
                            <p className={classes['general-informations-content-item']}>
                                <IconCalendarClock size={16} />{' '}
                                <span className={classes['general-informations-content-item-text']}>
                                    Dernière mise à jour :&nbsp;
                                    <div>
                                        <div>
                                            <OptionalText
                                                text={
                                                    detectionObject.userGroupLastUpdate ? (
                                                        <div className={classes['user-group-last-update']}>
                                                            {detectionObject.userGroupLastUpdate.name}
                                                        </div>
                                                    ) : undefined
                                                }
                                                emptyText="Aucun groupe"
                                            />
                                        </div>

                                        <DateInfo date={detectionObject.updatedAt} />
                                    </div>
                                </span>
                            </p>
                            <p className={classes['general-informations-content-item']}>
                                <IconMapPin size={16} />{' '}
                                <Link
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={clsx(classes['general-informations-content-item-text'], 'matomo_ignore')}
                                    to={getGoogleMapLink(centerPoint)}
                                    onClick={() =>
                                        trackEvent(TRACKING_CATEGORIES.detection, 'Google Maps ouvert', 'Coordonnées')
                                    }
                                >
                                    {latLong}
                                </Link>
                            </p>
                            <p className={classes['general-informations-content-item']}>
                                <IconMap size={16} />
                                <span className={classes['general-informations-content-item-text']}>
                                    {detectionObject.parcel ? (
                                        <>
                                            Parcelle :&nbsp;
                                            <Link
                                                to=""
                                                onClick={() => {
                                                    eventEmitter.emit(
                                                        'DISPLAY_PARCEL',
                                                        detectionObject.parcel.geometry,
                                                    );
                                                }}
                                            >
                                                {formatParcel(detectionObject.parcel)}
                                            </Link>
                                        </>
                                    ) : (
                                        <i>Parcelle non-spécifiée</i>
                                    )}
                                </span>
                            </p>

                            {
                                <p className={classes['general-informations-content-item']}>
                                    <IconHexagon size={16} />
                                    <span className={classes['general-informations-content-item-text']}>
                                        {detectionObject.geoCustomZones.length ? (
                                            <>
                                                Zones à enjeux :&nbsp;
                                                {formatGeoCustomZonesWithSubZones(detectionObject.geoCustomZones)}
                                            </>
                                        ) : (
                                            <i>Aucune zone à enjeux associée</i>
                                        )}
                                    </span>
                                </p>
                            }
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
                <DetectionDetailDetectionObject detectionObject={detectionObject} />
                <DetectionDetailDetectionData
                    detectionObject={detectionObject}
                    detectionRefreshing={detectionObjectRefreshing}
                    initialDetection={initialDetection}
                    tileSetSelected={tileSetSelected}
                    setTileSetSelected={setTileSetSelected}
                />
                <DetectionTileHistory detectionObject={detectionObject} setTileSetSelected={selectTileSetFromHistory} />
            </div>
        </ScrollArea>
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
                <div className={classes.inner}>
                    <div className={classes['top-section']}>
                        <h1>Objet détecté</h1>
                        <ActionIcon variant="transparent" onClick={onClose} aria-label="Fermer le détail de détection">
                            <IconX />
                        </ActionIcon>
                    </div>
                    <ErrorCard title="Objet inaccessible">
                        <p>{getLoadErrorMessage(error)}</p>
                    </ErrorCard>
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
