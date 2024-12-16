import { getDetectionObjectDetailEndpoint } from '@/api-endpoints';
import DetectionDetailDetectionData from '@/components/DetectionDetail/DetectionDetailDetectionData';
import DetectionDetailDetectionObject from '@/components/DetectionDetail/DetectionDetailDetectionObject';
import DetectionTileHistory from '@/components/DetectionDetail/DetectionTileHistory';
import SignalementPDFData from '@/components/signalement-pdf/SignalementPDFData';
import DateInfo from '@/components/ui/DateInfo';
import Loader from '@/components/ui/Loader';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { useMap } from '@/utils/context/map-context';
import { formatCommune, formatParcel } from '@/utils/format';
import { getAddressFromPolygon } from '@/utils/geojson';
import { Accordion, ActionIcon, Button, Group, Loader as MantineLoader, ScrollArea, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCalendarClock,
    IconDownload,
    IconHexagon,
    IconMap,
    IconMapPin,
    IconMapPinFilled,
    IconRoute,
    IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { centroid } from '@turf/turf';
import clsx from 'clsx';
import { Position } from 'geojson';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

const getGoogleMapLink = (point: Position) => `https://www.google.com/maps/?t=k&q=${point[1]},${point[0]}`;

const updateAdress = (objectTypeUuid: string, address: string) => {
    return api.patch(getDetectionObjectDetailEndpoint(objectTypeUuid), {
        address,
    });
};

interface ComponentInnerProps {
    detectionObject: DetectionObjectDetail;
    detectionObjectRefreshing: boolean;
    detectionUuid: string;
    onClose: () => void;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    detectionObject,
    detectionObjectRefreshing,
    detectionUuid,
    onClose,
}) => {
    const { eventEmitter } = useMap();
    const [signalementPdfLoading, setSignalementPdfLoading] = useState(false);

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
                    <h1>Objet détecté #{detectionObject.id}</h1>

                    {onClose ? (
                        <ActionIcon variant="transparent" onClick={onClose} aria-label="Fermer le détail de détection">
                            <IconX />
                        </ActionIcon>
                    ) : null}
                </div>

                <div>
                    <Group>
                        <Tooltip label="Télécharger la fiche de signalement" position="bottom-start">
                            <Button
                                variant="transparent"
                                disabled={signalementPdfLoading}
                                size="xs"
                                onClick={() => {
                                    notifications.show({
                                        title: 'Génération de la fiche de signalement en cours',
                                        message: 'Le téléchargement se lancera dans quelques instants',
                                    });
                                    setSignalementPdfLoading(true);
                                }}
                                leftSection={
                                    signalementPdfLoading ? <MantineLoader size="xs" /> : <IconDownload size={24} />
                                }
                            >
                                Fiche de signalement
                            </Button>
                        </Tooltip>

                        <Tooltip label="Ouvrir dans Google Maps" position="bottom-start">
                            <Button
                                variant="transparent"
                                component={Link}
                                size="xs"
                                leftSection={<IconMapPinFilled size={24} />}
                                to={getGoogleMapLink(centerPoint)}
                                target="_blank"
                            >
                                GMaps
                            </Button>
                        </Tooltip>
                    </Group>
                    {signalementPdfLoading ? (
                        <SignalementPDFData
                            detectionObjects={[detectionObject]}
                            onGenerationFinished={(error?: string) => {
                                if (error) {
                                    notifications.show({
                                        title: 'Erreur lors de la génération de la fiche de signalement',
                                        message: error,
                                        color: 'red',
                                    });
                                }

                                setSignalementPdfLoading(false);
                            }}
                        />
                    ) : null}
                </div>

                <Accordion variant="contained" className={classes['general-informations']} defaultValue="infos">
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
                                        {detectionObject.userGroupLastUpdate ? (
                                            <div>
                                                <b>{detectionObject.userGroupLastUpdate.name}</b>
                                            </div>
                                        ) : (
                                            <div>Aucun groupe</div>
                                        )}
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
                                                {detectionObject.geoCustomZones.map((zone) => zone.name).join(', ')}
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
    detectionUuid: string;
    onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({ detectionObjectUuid, detectionUuid, onClose }: ComponentProps) => {
    const { eventEmitter } = useMap();
    const fetchData = async () => {
        const res = await api.get<DetectionObjectDetail>(getDetectionObjectDetailEndpoint(detectionObjectUuid));

        return res.data;
    };
    const {
        data: detectionObject,
        isRefetching: detectionObjectRefreshing,
        refetch,
    } = useQuery({
        queryKey: [getDetectionObjectDetailEndpoint(String(detectionObjectUuid))],
        queryFn: () => fetchData(),
    });
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
            detectionObject={detectionObject}
            detectionObjectRefreshing={detectionObjectRefreshing}
            detectionUuid={detectionUuid}
            onClose={onClose}
        />
    );
};

export default Component;
