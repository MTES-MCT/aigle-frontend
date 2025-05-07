import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getParcelDownloadInfosEndpoint } from '@/api-endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import SignalementPDFPage, {
    PreviewImage,
    ComponentProps as SignalementPDFPageProps,
} from '@/components/signalement-pdf/SignalementPDFPage';
import { ParcelDetail } from '@/models/parcel';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { PARCEL_COLOR } from '@/utils/constants';
import { formatParcel } from '@/utils/format';
import { extendBbox } from '@/utils/geojson';
import { Document, usePDF } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import { bbox, centroid } from '@turf/turf';
import { format } from 'date-fns';
import { Polygon } from 'geojson';
import classes from './index.module.scss';

const fetchParcelDetail = async (uuid: string, detectionObjectUuid?: string) => {
    const res = await api.get<ParcelDetail>(getParcelDownloadInfosEndpoint(uuid), {
        params: {
            detectionObjectUuid,
        },
    });

    return res.data;
};

const getSignalementPDFDocumentName = (parcel?: ParcelDetail) => {
    let name = 'signalement ';

    if (parcel) {
        name += `${formatParcel(parcel)} `;
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
                a.download = getSignalementPDFDocumentName(pdfProps[0].parcel);
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
    // GEOGRAPHICAL.GRIDSYSTEMS.MAPS.SCAN25.GRAPHE-MOSAIQUAGE:graphe_scan25
    url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM_0_19&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    tileSetStatus: 'VISIBLE',
    tileSetScheme: 'xyz',
    tileSetType: 'BACKGROUND',
    minZoom: null,
    maxZoom: null,
    uuid: 'e55bfa81-a6dd-407c-a1f1-70bc2211a11c',
    createdAt: '2024-07-08T16:00:31Z',
    updatedAt: '2024-07-08T16:00:31Z',
    monochrome: false,
};

const getPreviewId = (tileSetUuid: string, parcelUuid: string) => `preview-${parcelUuid}-${tileSetUuid}`;

interface PreviewImagesProps {
    setFinalData: (previewImages: PreviewImage[], parcel: ParcelDetail) => void;
    parcelUuid: string;
    detectionObjectUuid?: string;
}

const PreviewImages: React.FC<PreviewImagesProps> = ({ parcelUuid, detectionObjectUuid, setFinalData }) => {
    const [previewImages, setPreviewImages] = useState<Record<string, PreviewImage>>({});

    const { data: parcel, isLoading: parcelIsLoading } = useQuery({
        queryKey: [getParcelDownloadInfosEndpoint(String(parcelUuid))],
        queryFn: () => fetchParcelDetail(parcelUuid, detectionObjectUuid),
    });

    const tileSetsToRender = parcel?.tileSetPreviews.filter(({ preview }) => preview) || [];

    useEffect(() => {
        if (!parcel || Object.keys(previewImages).length !== tileSetsToRender.length + 1) {
            return;
        }

        setFinalData(Object.values(previewImages), parcel);
    }, [previewImages, parcel]);
    const tileSetUuidsGeometryMap = useMemo(() => {
        const res: Record<
            string,
            {
                geometry: Polygon;
                color: string;
            }[]
        > = {};

        if (!parcel) {
            return res;
        }

        parcel.detectionObjects.forEach((detectionObject) => {
            detectionObject.detections.forEach((detection) => {
                // we only want to display the detection of the current detection object if specified
                if (detectionObjectUuid && detectionObjectUuid !== detectionObject.uuid) {
                    return;
                }

                if (!res[detection.tileSet.uuid]) {
                    res[detection.tileSet.uuid] = [];
                }
                res[detection.tileSet.uuid].push({
                    geometry: detection.geometry,
                    color: detectionObject.objectType.color,
                });
            });
        });

        return res;
    }, [parcel]);

    const previewBounds = useMemo(() => {
        if (!parcel) {
            return undefined;
        }

        return bbox(parcel.geometry) as [number, number, number, number];
    }, [parcel]);

    const getPreviewImage = useCallback((uuid: string, previewId: string, title: string, index: number) => {
        if (previewImages[uuid]) {
            return;
        }

        const canvas = document.querySelector(`#${previewId} canvas`);

        let src;
        try {
            src = (canvas as HTMLCanvasElement).toDataURL('image/png');
        } catch (e) {
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

    if (parcelIsLoading || !parcel || !previewBounds || !tileSetUuidsGeometryMap || !tileSetsToRender) {
        return null;
    }
    const planPreviewId = getPreviewId(PLAN_URL_TILESET.uuid, parcel.uuid);

    return (
        <div className={classes.container}>
            {tileSetsToRender.map(({ tileSet }, index) => {
                if (previewImages[tileSet.uuid]) {
                    return null;
                }

                const previewId = getPreviewId(tileSet.uuid, parcel.uuid);

                return (
                    <DetectionTilePreview
                        geometries={[
                            ...(tileSetUuidsGeometryMap[tileSet.uuid] || []),
                            ...(parcel?.geometry ? [{ geometry: parcel.geometry, color: PARCEL_COLOR }] : []),
                        ]}
                        tileSet={tileSet}
                        key={previewId}
                        bounds={previewBounds}
                        classNames={{
                            main: classes['detection-tile-preview-detail'],
                            inner: classes['detection-tile-preview-inner'],
                        }}
                        reuseMaps={false}
                        id={previewId}
                        displayName={false}
                        onIdle={() => {
                            setTimeout(
                                () => getPreviewImage(tileSet.uuid, previewId, format(tileSet.date, 'yyyy'), index),
                                3000,
                            );
                        }}
                        extendedLevel={1}
                    />
                );
            })}
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
                    key={planPreviewId}
                    id={planPreviewId}
                    displayName={false}
                    reuseMaps={false}
                    onIdle={() =>
                        setTimeout(
                            () =>
                                getPreviewImage(PLAN_URL_TILESET.uuid, planPreviewId, 'Plan', tileSetsToRender.length),
                            3000,
                        )
                    }
                    reuseMaps={false}
                    pinPosition={parcel?.geometry ? centroid(parcel?.geometry).geometry.coordinates : undefined}
                />
            ) : null}
        </div>
    );
};

const NBR_PAGES_TO_RENDER_AT_ONCE = 2;
interface PagePreviewParams {
    detectionObjectUuid?: string;
    parcelUuid: string;
}

interface ComponentProps {
    previewParams: PagePreviewParams[];
    setNbrDetectionObjectsProcessed?: (nbr: number) => void;
    onGenerationFinished: (error?: string) => void;
}
const Component: React.FC<ComponentProps> = ({
    previewParams,
    setNbrDetectionObjectsProcessed,
    onGenerationFinished,
}: ComponentProps) => {
    const [pdfProps, setPdfProps] = useState<SignalementPDFPageProps[]>([]);

    const [pagesDisplayed, setPagesDisplayed] = useState<PagePreviewParams[]>(
        previewParams.slice(0, NBR_PAGES_TO_RENDER_AT_ONCE),
    );
    const [pagePreviewsDone, setPagePreviewsDone] = useState<PagePreviewParams[]>([]);

    useEffect(() => {
        if (!pagePreviewsDone.length || pagePreviewsDone.length === previewParams.length) {
            return;
        }

        const pagePreviewsToDisplay = previewParams.filter(
            (param) =>
                !pagePreviewsDone.some(
                    (donePp) =>
                        donePp.parcelUuid === param.parcelUuid &&
                        donePp.detectionObjectUuid === param.detectionObjectUuid,
                ),
        );

        if (pagePreviewsToDisplay.length === 0) {
            return;
        }

        const nbrElementsToDisplay = Math.min(
            NBR_PAGES_TO_RENDER_AT_ONCE,
            previewParams.length - pagePreviewsDone.length,
        );

        setPagesDisplayed((pagesDisplayed) => [
            ...pagesDisplayed,
            ...pagePreviewsToDisplay.slice(0, nbrElementsToDisplay),
        ]);
        setNbrDetectionObjectsProcessed && setNbrDetectionObjectsProcessed(pagePreviewsDone.length);
    }, [pagePreviewsDone]);

    return (
        <div className={classes.container}>
            {pagesDisplayed.map((pagePreviewProps) => (
                <PreviewImages
                    {...pagePreviewProps}
                    key={`download-${pagePreviewProps.detectionObjectUuid || pagePreviewProps.parcelUuid}`}
                    setFinalData={(previewImages: PreviewImage[], parcel: ParcelDetail) => {
                        setPdfProps((prev) => {
                            const centerPoint = parcel.geometry
                                ? centroid(parcel.geometry).geometry.coordinates
                                : undefined;
                            return [
                                ...prev,
                                {
                                    detectionObjects: parcel?.detectionObjects || [],
                                    latLong: centerPoint
                                        ? `${centerPoint[1].toFixed(5)}, ${centerPoint[0].toFixed(5)}`
                                        : 'inconnu',
                                    previewImages: previewImages.sort((a, b) => a.index - b.index),
                                    parcel,
                                },
                            ];
                        });
                        setPagePreviewsDone((prev) => [...prev, pagePreviewProps]);
                    }}
                />
            ))}

            {pagePreviewsDone.length === previewParams.length ? (
                <DocumentContainer pdfProps={pdfProps} onGenerationFinished={onGenerationFinished} />
            ) : null}
        </div>
    );
};

export default Component;
