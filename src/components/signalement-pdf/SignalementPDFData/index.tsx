import React, { useCallback, useEffect, useState } from 'react';

import { getParcelDownloadInfosEndpoint } from '@/api-endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import SignalementPDFPage, {
    PreviewImage,
    ComponentProps as SignalementPDFPageProps,
} from '@/components/signalement-pdf/SignalementPDFPage';
import { DetectionWithTile } from '@/models/detection';
import { DetectionObjectDetail } from '@/models/detection-object';
import { ParcelDetail } from '@/models/parcel';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { DEFAULT_DATE_FORMAT, PARCEL_COLOR } from '@/utils/constants';
import { formatParcel } from '@/utils/format';
import { convertBBoxToSquare, extendBbox } from '@/utils/geojson';
import { Document, usePDF } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import { bbox, bboxPolygon } from '@turf/turf';
import { format } from 'date-fns';
import { Polygon } from 'geojson';
import classes from './index.module.scss';

const fetchParcelDetail = async (uuid: string, tileSetUuid: string, detectionObjectUuid: string) => {
    const res = await api.get<ParcelDetail>(getParcelDownloadInfosEndpoint(uuid), {
        params: {
            tileSetUuid,
            detectionObjectUuid,
        },
    });

    return res.data;
};

const getSignalementPDFDocumentName = (detectionObject?: DetectionObjectDetail) => {
    let name = 'signalement ';

    if (detectionObject?.parcel) {
        name += `${formatParcel(detectionObject.parcel)} `;
    }

    name += `- ${format(new Date(), 'dd-MM-yyyy-HH-mm-ss')}`;

    return name;
};

interface DocumentContainerProps {
    onGenerationFinished: (error?: string) => void;
    pdfProps: SignalementPDFPageProps[];
}

const DocumentContainer: React.FC<DocumentContainerProps> = ({ onGenerationFinished, pdfProps }) => {
    const pdfDocument = (
        <Document>
            {pdfProps.map((props, index) => (
                <SignalementPDFPage {...props} key={index} />
            ))}
        </Document>
    );

    const [instance] = usePDF({ document: pdfDocument });

    useEffect(() => {
        if (instance.blob) {
            const url = URL.createObjectURL(instance.blob);
            const a = document.createElement('a');

            a.href = url;

            if (pdfProps.length === 1) {
                a.download = getSignalementPDFDocumentName(pdfProps[0].detectionObject);
            } else {
                a.download = getSignalementPDFDocumentName();
            }

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onGenerationFinished();
        }
    }, [instance.blob]);

    return <></>;
};

const PLAN_URL_TILESET: TileSet = {
    date: '2024-07-08T16:00:31Z',
    name: 'Plan',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileSetStatus: 'VISIBLE',
    tileSetScheme: 'xyz',
    tileSetType: 'BACKGROUND',
    minZoom: null,
    maxZoom: null,
    uuid: 'e55bfa81-a6dd-407c-a1f1-70bc2211a11c',
    createdAt: '2024-07-08T16:00:31Z',
    updatedAt: '2024-07-08T16:00:31Z',
    monochrome: true,
};

const getPreviewId = (tileSetUuid: string, detectionObjectUuid: string) =>
    `preview-${detectionObjectUuid}-${tileSetUuid}`;

const getParcelCrossCoordinates = (parcelGeometry: Polygon) => {
    const parcelBbox = convertBBoxToSquare(bbox(parcelGeometry) as [number, number, number, number]);

    const parcelBboxExtended = extendBbox(parcelBbox as [number, number, number, number], 10);

    const parcelPolygonExtended = bboxPolygon(parcelBboxExtended);

    return [
        parcelPolygonExtended.geometry.coordinates[0][0],
        parcelPolygonExtended.geometry.coordinates[0][1],
        parcelPolygonExtended.geometry.coordinates[0][2],
        parcelPolygonExtended.geometry.coordinates[0][3],
    ];
};

interface PreviewImagesProps {
    detectionObject: DetectionObjectDetail;
    setFinalData: (previewImages: PreviewImage[], parcel: ParcelDetail | null) => void;
}

const PreviewImages: React.FC<PreviewImagesProps> = ({ detectionObject, setFinalData }) => {
    const tileSetsToRender = detectionObject.tileSets.filter(({ preview }) => preview).reverse();

    const [previewImages, setPreviewImages] = useState<Record<string, PreviewImage>>({});
    const previewBounds = bbox(detectionObject.detections[0].tile.geometry) as [number, number, number, number];
    const tileSetUuidsDetectionsMap = detectionObject.detections.reduce<Record<string, DetectionWithTile>>(
        (prev, curr) => {
            prev[curr.tileSet.uuid] = curr;
            return prev;
        },
        {},
    );
    const lastTileSetUuid = tileSetsToRender[0].tileSet.uuid;

    const { data: parcel, isLoading: parcelIsLoading } = useQuery({
        queryKey: [getParcelDownloadInfosEndpoint(String(detectionObject.parcel?.uuid))],
        enabled: !!detectionObject.parcel?.uuid,
        queryFn: () => fetchParcelDetail(String(detectionObject.parcel?.uuid), lastTileSetUuid, detectionObject.uuid),
    });

    useEffect(() => {
        if (Object.keys(previewImages).length !== tileSetsToRender.length + 1) {
            return;
        }

        setFinalData(Object.values(previewImages), parcel || null);
    }, [previewImages]);

    const getPreviewImage = useCallback((uuid: string, title: string, index: number) => {
        if (previewImages[uuid]) {
            return;
        }

        const id = getPreviewId(uuid, detectionObject.uuid);
        const canvas = document.querySelector(`#${id} canvas`);

        let src;

        try {
            src = (canvas as HTMLCanvasElement).toDataURL('image/png');
        } catch {
            return;
        }

        setPreviewImages((prev) => ({
            ...prev,
            [uuid]: {
                index: index,
                src: src,
                title: title,
            },
        }));
    }, []);

    if (parcelIsLoading) {
        return null;
    }

    return (
        <div className={classes.container}>
            SignalementPDFdata {detectionObject.id}
            {tileSetsToRender.map(({ tileSet }, index) =>
                !previewImages[tileSet.uuid] ? (
                    <DetectionTilePreview
                        geometries={[
                            ...(tileSetUuidsDetectionsMap[tileSet.uuid]?.geometry
                                ? [
                                      {
                                          geometry: tileSetUuidsDetectionsMap[tileSet.uuid].geometry,
                                          color: detectionObject.objectType.color,
                                      },
                                  ]
                                : []),
                            ...(parcel?.geometry ? [{ geometry: parcel.geometry, color: PARCEL_COLOR }] : []),
                        ]}
                        tileSet={tileSet}
                        key={getPreviewId(tileSet.uuid, detectionObject.uuid)}
                        bounds={previewBounds}
                        classNames={{
                            main: classes['detection-tile-preview-detail'],
                            inner: classes['detection-tile-preview-inner'],
                        }}
                        id={getPreviewId(tileSet.uuid, detectionObject.uuid)}
                        displayName={false}
                        onIdle={() => {
                            setTimeout(
                                () => getPreviewImage(tileSet.uuid, format(tileSet.date, DEFAULT_DATE_FORMAT), index),
                                3000,
                            );
                        }}
                        extendedLevel={1}
                    />
                ) : null,
            )}
            {!previewImages[PLAN_URL_TILESET.uuid] ? (
                <DetectionTilePreview
                    tileSet={PLAN_URL_TILESET}
                    bounds={
                        parcel
                            ? (extendBbox(bbox(parcel.communeEnvelope), 1.2) as [number, number, number, number])
                            : previewBounds
                    }
                    classNames={{
                        main: classes['detection-tile-preview-detail'],
                        inner: classes['detection-tile-preview-inner'],
                    }}
                    key={getPreviewId(PLAN_URL_TILESET.uuid, detectionObject.uuid)}
                    id={getPreviewId(PLAN_URL_TILESET.uuid, detectionObject.uuid)}
                    displayName={false}
                    onIdle={() =>
                        setTimeout(() => getPreviewImage(PLAN_URL_TILESET.uuid, 'Plan', tileSetsToRender.length), 3000)
                    }
                    reuseMaps={false}
                    imageLayer={
                        parcel
                            ? {
                                  coordinates: getParcelCrossCoordinates(parcel?.geometry),
                                  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAALQAQMAAACDmdXfAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAZQTFRFAAAA/wAAG/+NIgAAAAJ0Uk5TAP9bkSK1AAABE0lEQVR4nO3asQkAIAwEQIOLubp7CdpaBivF+y7wuQk+Sip1bEdvqZ9Ao9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPR6M/pmbMPgkaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1G/0XnarctiNBoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9FoNBqNRqPRaDT6AXoBFUc+uG9VIhoAAAAASUVORK5CYII=',
                              }
                            : undefined
                    }
                />
            ) : null}
        </div>
    );
};

const NBR_ELEMENTS_TO_DISPLAY = 2;

interface ComponentProps {
    detectionObjects: DetectionObjectDetail[];
    setNbrDetectionObjectsProcessed?: (nbr: number) => void;
    onGenerationFinished: (error?: string) => void;
}
const Component: React.FC<ComponentProps> = ({
    detectionObjects,
    setNbrDetectionObjectsProcessed,
    onGenerationFinished,
}: ComponentProps) => {
    const [pdfProps, setPdfProps] = useState<SignalementPDFPageProps[]>([]);
    const [detectionObjectsDisplayed, setDetectionObjectsDisplayed] = useState<DetectionObjectDetail[]>(
        detectionObjects.slice(0, NBR_ELEMENTS_TO_DISPLAY),
    );
    const [detectionObjectUuidsDone, setDetectionObjectUuidsDone] = useState<string[]>([]);

    useEffect(() => {
        if (detectionObjectUuidsDone.length === detectionObjects.length) {
            return;
        }

        const oldDetectionsToDisplay = detectionObjectsDisplayed.filter(
            ({ uuid }) => !detectionObjectUuidsDone.includes(uuid),
        );

        const nbrElementsToDisplay = NBR_ELEMENTS_TO_DISPLAY - oldDetectionsToDisplay.length;

        if (nbrElementsToDisplay === 0) {
            return;
        }

        const uuidsAlreadyDisplayed = [...oldDetectionsToDisplay.map(({ uuid }) => uuid), ...detectionObjectUuidsDone];
        const detectionObjectsToDisplay = detectionObjects.filter(({ uuid }) => !uuidsAlreadyDisplayed.includes(uuid));

        setDetectionObjectsDisplayed([
            ...oldDetectionsToDisplay,
            ...detectionObjectsToDisplay.slice(0, nbrElementsToDisplay),
        ]);
        setNbrDetectionObjectsProcessed && setNbrDetectionObjectsProcessed(detectionObjectUuidsDone.length);
    }, [detectionObjectUuidsDone]);

    return (
        <div className={classes.container}>
            {detectionObjectsDisplayed.map((detectionObject) => (
                <PreviewImages
                    detectionObject={detectionObject}
                    key={`download-${detectionObject.uuid}`}
                    setFinalData={(previewImages: PreviewImage[], parcel: ParcelDetail | null) => {
                        setPdfProps((prev) => [
                            ...prev,
                            {
                                detectionObject,
                                previewImages: previewImages.sort((a, b) => a.index - b.index),
                                parcel,
                            },
                        ]);
                        setDetectionObjectUuidsDone((prev) => [...prev, detectionObject.uuid]);
                    }}
                />
            ))}

            {pdfProps.length === detectionObjects.length ? (
                <DocumentContainer pdfProps={pdfProps} onGenerationFinished={onGenerationFinished} />
            ) : null}
        </div>
    );
};

export default Component;
