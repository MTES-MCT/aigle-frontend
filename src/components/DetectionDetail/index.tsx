import { getDetectionForceVisibleEndpoint, getDetectionObjectDetailEndpoint } from '@/api-endpoints';
import DetectionDetailDetectionData from '@/components/DetectionDetail/DetectionDetailDetectionData';
import DetectionDetailDetectionObject from '@/components/DetectionDetail/DetectionDetailDetectionObject';
import DetectionTileHistory from '@/components/DetectionDetail/DetectionTileHistory';
import { getFiltersToMakeVisible } from '@/components/DetectionDetail/utils/force-visible';
import SignalementPDFData from '@/components/signalement-pdf/SignalementPDFData';
import DateInfo from '@/components/ui/DateInfo';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import WarningCard from '@/components/ui/WarningCard';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { useMap } from '@/utils/context/map-context';
import { formatCommune, formatGeoCustomZonesWithSubZones, formatParcel } from '@/utils/format';
import { getAddressFromPolygon } from '@/utils/geojson';
import { getDetectionObjectLink } from '@/utils/link';
import { Accordion, ActionIcon, Anchor, Button, Loader as MantineLoader, ScrollArea, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCalendarClock,
    IconDownload,
    IconHexagon,
    IconMap,
    IconMapDown,
    IconMapPin,
    IconMapPinFilled,
    IconRoute,
    IconShare2,
    IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';
import clsx from 'clsx';
import { Position } from 'geojson';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

type SignalementPDFType = 'detectionObject' | 'parcel';

const getGoogleMapLink = (point: Position) => `https://www.google.com/maps/?t=k&q=${point[1]},${point[0]}`;

const updateAdress = (objectTypeUuid: string, address: string) => {
    return api.patch(getDetectionObjectDetailEndpoint(objectTypeUuid), {
        address,
    });
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
    const { eventEmitter, objectsFilter, updateObjectsFilter } = useMap();
    const [signalementPdfGenerating, setSignalementPdfGenerating] = useState<SignalementPDFType | undefined>();
    const [forceVisibleLoading, setForceVisibleLoading] = useState(false);

    const initialDetection =
        detectionObject.detections.find((detection) => detection.uuid === detectionUuid) ||
        detectionObject.detections[0];
    const [tileSetSelected, setTileSetSelected] = useState<TileSet>(initialDetection.tileSet);

    const {
        geometry: { coordinates: centerPoint },
    } = centroid(initialDetection.geometry);

    const latLong = `${centerPoint[1].toFixed(5)}, ${centerPoint[0].toFixed(5)}`;
    const [address, setAddress] = useState<string | null | undefined>(detectionObject.address || undefined);

    useEffect(() => {
        if (detectionObject.address) {
            return;
        }

        const getAddress = async () => {
            const address = await getAddressFromPolygon(detectionObject.detections[0].geometry);
            setAddress(address);

            if (address) {
                await updateAdress(detectionObject.uuid, address);
            }
        };

        getAddress();
    }, []);

    return (
        <ScrollArea scrollbars="y" offsetScrollbars={true} classNames={{ root: classes.container }}>
            <div className={classes.inner}>
                <div className={classes['top-section']}>
                    <h1>
                        Objet détecté{' '}
                        <Anchor
                            onClick={() => {
                                navigator.clipboard.writeText(getDetectionObjectLink(detectionObject.uuid, true));
                                notifications.show({
                                    title: 'Lien copié dans le presse-papier',
                                    message: "Le lien vers l'objet détecté a été copié dans le presse-papier",
                                });
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
                                    setSignalementPdfGenerating('detectionObject');
                                }}
                                leftSection={
                                    signalementPdfGenerating === 'detectionObject' ? (
                                        <MantineLoader size="xs" />
                                    ) : (
                                        <IconDownload size={20} />
                                    )
                                }
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
                                    setSignalementPdfGenerating('parcel');
                                }}
                                leftSection={
                                    signalementPdfGenerating === 'parcel' ? (
                                        <MantineLoader size="xs" />
                                    ) : (
                                        <IconMapDown size={20} />
                                    )
                                }
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
                            onGenerationFinished={(error?: string) => {
                                if (error) {
                                    notifications.show({
                                        title: 'Erreur lors de la génération de la fiche de signalement',
                                        message: error,
                                        color: 'red',
                                    });
                                }

                                setSignalementPdfGenerating(undefined);
                            }}
                        />
                    ) : null}
                </div>

                <Tooltip label="Ouvrir dans Google Maps" position="bottom-start">
                    <Button
                        variant="light"
                        component={Link}
                        size="xs"
                        leftSection={<IconMapPinFilled size={20} />}
                        to={getGoogleMapLink(centerPoint)}
                        target="_blank"
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

                                notifications.show({
                                    title: 'Filtres mis à jour',
                                    message: 'Les filtres ont été mis à jour pour rendre la détection visible',
                                });

                                setForceVisibleLoading(true);
                                await api.patch(getDetectionForceVisibleEndpoint(detectionObject.detections[0].uuid));
                                setForceVisibleLoading(false);
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
                                                {address === undefined ? (
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
                                    className={classes['general-informations-content-item-text']}
                                    to={getGoogleMapLink(centerPoint)}
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
                <DetectionTileHistory detectionObject={detectionObject} setTileSetSelected={setTileSetSelected} />
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
    const { eventEmitter, setIsDetailFetching } = useMap();
    const fetchData = async () => {
        const res = await api.get<DetectionObjectDetail>(getDetectionObjectDetailEndpoint(detectionObjectUuid));

        return res.data;
    };
    const {
        data: detectionObject,
        isRefetching: detectionObjectRefreshing,
        refetch,
        isFetching: isFetchingDetectionObject,
    } = useQuery({
        queryKey: [getDetectionObjectDetailEndpoint(String(detectionObjectUuid))],
        queryFn: async () => {
            const res = await fetchData();

            eventEmitter.emit('JUMP_TO', getCoord(centroid(res.detections[0].geometry)));

            return res;
        },
    });
    useEffect(() => {
        setIsDetailFetching(isFetchingDetectionObject);
    }, [isFetchingDetectionObject]);
    useEffect(() => {
        eventEmitter.on('UPDATE_DETECTION_DETAIL', refetch);

        return () => {
            eventEmitter.off('UPDATE_DETECTION_DETAIL', refetch);
        };
    }, []);

    if (!detectionObject) {
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
