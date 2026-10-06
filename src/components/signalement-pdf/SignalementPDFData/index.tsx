import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { parcelEndpoints } from '@/api/endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import SignalementPDFPage, {
    PreviewImage,
    ComponentProps as SignalementPDFPageProps,
} from '@/components/signalement-pdf/SignalementPDFPage';
import { ParcelDetail, ParcelDetectionObject } from '@/models/parcel';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { PARCEL_COLOR } from '@/utils/constants';
import { triggerDownload } from '@/utils/download';
import { formatDateOnly, formatParcel } from '@/utils/format';
import { extendBbox } from '@/utils/geojson';
import { Document, usePDF } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import { bbox, centroid } from '@turf/turf';
import { format } from 'date-fns';
import { Polygon } from 'geojson';
import classes from './index.module.scss';

const fetchParcelDetail = (uuid: string, detectionObjectUuid?: string, signal?: AbortSignal) =>
    api<ParcelDetail>(parcelEndpoints.downloadInfos(uuid), {
        params: { detectionObjectUuid },
        signal,
    });

const getSignalementPDFDocumentName = (parcel?: ParcelDetail) => {
    let name = 'signalement ';

    if (parcel) {
        name += `${formatParcel(parcel)} `;
    }

    name += `- ${format(new Date(), 'dd-MM-yyyy-HH-mm-ss')}`;

    return name;
};

// Why a generation stopped, for the caller's tracking: the message is shown, never sent.
export type SignalementFailureReason = 'Parcelle sans détection' | 'Récupération' | 'Erreur de génération';

const FAILURE_MESSAGES: Record<SignalementFailureReason, string> = {
    'Parcelle sans détection': 'Cette parcelle ne comporte aucune détection à signaler.',
    Récupération: "Les informations de la parcelle n'ont pas pu être récupérées.",
    'Erreur de génération': "Le document n'a pas pu être généré",
};

interface DocumentContainerProps {
    onFinished: (failureReason?: SignalementFailureReason) => void;
    pdfProps: SignalementPDFPageProps[];
}

const DocumentContainer: React.FC<DocumentContainerProps> = ({ onFinished, pdfProps }) => {
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
            triggerDownload(
                instance.blob,
                getSignalementPDFDocumentName(pdfProps.length === 1 ? pdfProps[0].parcel : undefined),
            );

            onFinished();
        }
    }, [instance.blob]);

    // without this a render failure leaves the caller waiting on a blob that never comes
    useEffect(() => {
        if (!instance.error) {
            return;
        }

        onFinished('Erreur de génération');
    }, [instance.error]);

    return <></>;
};

const PLAN_URL_TILESET: TileSet = {
    date: '2024-07-08',
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

// a page is identified by (parcel, detection object): two objects on the same parcel render
// at the same time, and sharing an id made the second page capture the first one's canvas
const getPreviewId = (tileSetUuid: string, parcelUuid: string, detectionObjectUuid?: string) =>
    `preview-${detectionObjectUuid || parcelUuid}-${tileSetUuid}`;

interface PreviewGeometry {
    geometry: Polygon;
    color: string;
}

const getPreviewGeometries = (
    tileSetUuid: string,
    detectionObjects: ParcelDetectionObject[],
    detectionObjectUuid?: string,
): PreviewGeometry[] => {
    const res: PreviewGeometry[] = [];

    detectionObjects.forEach((detectionObject) => {
        detectionObject.detections.forEach((detection) => {
            if (detection.tileSet.uuid !== tileSetUuid) {
                return;
            }

            // we only want to display the detection of the current detection object if specified
            if (detectionObjectUuid && detectionObjectUuid !== detectionObject.uuid) {
                return;
            }

            res.push({
                geometry: detection.geometry,
                color: detectionObject.objectType.color,
            });
        });
    });

    return res;
};

interface PreviewImagesProps {
    setFinalData: (previewImages: PreviewImage[], parcel: ParcelDetail) => void;
    onFailure: (failureReason: SignalementFailureReason) => void;
    parcelUuid: string;
    detectionObjectUuid?: string;
}

const PreviewImages: React.FC<PreviewImagesProps> = ({ parcelUuid, detectionObjectUuid, setFinalData, onFailure }) => {
    const [previewImages, setPreviewImages] = useState<Record<string, PreviewImage>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        data: parcel,
        isLoading: parcelIsLoading,
        isError: parcelIsError,
    } = useQuery({
        // the payload is scoped to the detection object, so two objects sharing a parcel
        // must not share a cache entry
        queryKey: [parcelEndpoints.downloadInfos(String(parcelUuid)), detectionObjectUuid],
        queryFn: ({ signal }) => fetchParcelDetail(parcelUuid, detectionObjectUuid, signal),
    });

    const tileSetsToRender = parcel?.tileSetPreviews?.filter(({ preview }) => preview) || [];

    useEffect(() => {
        if (!parcel || Object.keys(previewImages).length !== tileSetsToRender.length + 1) {
            return;
        }

        setFinalData(Object.values(previewImages), parcel);
    }, [previewImages, parcel]);

    // a parcel with no detection to signal comes back as an empty payload from the download endpoint
    useEffect(() => {
        if (parcelIsLoading || !parcel || parcel.geometry) {
            return;
        }

        onFailure('Parcelle sans détection');
    }, [parcel, parcelIsLoading]);

    useEffect(() => {
        if (parcelIsError) {
            onFailure('Récupération');
        }
    }, [parcelIsError]);

    const previewBounds = useMemo(() => {
        if (!parcel || !parcel.geometry) {
            return undefined;
        }

        return bbox(parcel.geometry) as [number, number, number, number];
    }, [parcel]);

    const getPreviewImage = useCallback(
        (uuid: string, previewId: string, title: string, index: number) => {
            if (previewImages[uuid]) {
                return;
            }

            // scoped to this page's own previews: several pages render at the same time
            const canvas = containerRef.current?.querySelector(`#${previewId} canvas`);

            let src;
            try {
                src = (canvas as HTMLCanvasElement).toDataURL('image/png');
            } catch (e) {
                // a preview reports itself loaded only once, so this page would never be done
                console.error(e);
                onFailure('Erreur de génération');
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
        },
        [previewImages, onFailure],
    );

    if (parcelIsLoading || !parcel || !previewBounds || !tileSetsToRender) {
        return null;
    }
    const planPreviewId = getPreviewId(PLAN_URL_TILESET.uuid, parcel.uuid, detectionObjectUuid);

    return (
        <div className={classes.container} ref={containerRef}>
            {tileSetsToRender.map(({ tileSet }, index) => {
                if (previewImages[tileSet.uuid]) {
                    return null;
                }

                const previewId = getPreviewId(tileSet.uuid, parcel.uuid, detectionObjectUuid);

                return (
                    <DetectionTilePreview
                        geometries={[
                            ...(getPreviewGeometries(tileSet.uuid, parcel.detectionObjects, detectionObjectUuid) || []),
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
                        onFullyLoaded={() =>
                            getPreviewImage(tileSet.uuid, previewId, formatDateOnly(tileSet.date, 'yyyy'), index)
                        }
                        fitBoundsOptions={{ padding: 10 }}
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
                    onFullyLoaded={() =>
                        getPreviewImage(PLAN_URL_TILESET.uuid, planPreviewId, 'Plan', tileSetsToRender.length)
                    }
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
    // called once per generation: with the message to show and its reason when it failed
    onGenerationFinished: (error?: string, failureReason?: SignalementFailureReason) => void;
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

    // the parent re-creates this callback on every render, so it cannot be an effect dependency
    const setNbrProcessedRef = useRef(setNbrDetectionObjectsProcessed);
    setNbrProcessedRef.current = setNbrDetectionObjectsProcessed;

    const onGenerationFinishedRef = useRef(onGenerationFinished);
    onGenerationFinishedRef.current = onGenerationFinished;
    const generationFinishedRef = useRef(false);

    // a generation ends once: what the other pages report after a failure is dropped
    const finishGeneration = useCallback((failureReason?: SignalementFailureReason) => {
        if (generationFinishedRef.current) {
            return;
        }
        generationFinishedRef.current = true;

        onGenerationFinishedRef.current(failureReason && FAILURE_MESSAGES[failureReason], failureReason);
    }, []);

    // reported on its own, the loop below stops counting before the last page
    useEffect(() => {
        setNbrProcessedRef.current?.(pagePreviewsDone.length);
    }, [pagePreviewsDone.length]);

    useEffect(() => {
        if (!pagePreviewsDone.length || pagePreviewsDone.length === previewParams.length) {
            return;
        }

        setPagesDisplayed((currentPagesDisplayed) => {
            const pagePreviewsToDisplay = previewParams.filter(
                (param) =>
                    !currentPagesDisplayed.some(
                        (displayedPp) =>
                            displayedPp.parcelUuid === param.parcelUuid &&
                            displayedPp.detectionObjectUuid === param.detectionObjectUuid,
                    ),
            );

            if (pagePreviewsToDisplay.length === 0) {
                return currentPagesDisplayed;
            }

            const nbrElementsToDisplay = Math.min(NBR_PAGES_TO_RENDER_AT_ONCE, pagePreviewsToDisplay.length);

            return [...currentPagesDisplayed, ...pagePreviewsToDisplay.slice(0, nbrElementsToDisplay)];
        });
    }, [pagePreviewsDone, previewParams]);

    return (
        <div className={classes.container}>
            {pagesDisplayed.map((pagePreviewProps) => (
                <PreviewImages
                    {...pagePreviewProps}
                    key={`download-${pagePreviewProps.detectionObjectUuid || pagePreviewProps.parcelUuid}`}
                    onFailure={finishGeneration}
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
                <DocumentContainer pdfProps={pdfProps} onFinished={finishGeneration} />
            ) : null}
        </div>
    );
};

export default Component;
