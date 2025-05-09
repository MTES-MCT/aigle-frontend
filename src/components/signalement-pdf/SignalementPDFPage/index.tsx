import logoImg from '@/assets/logo.png';
import republiqueFrancaiseImg from '@/assets/signalement-pdf/republique_francaise.png';
import { ParcelDetail, ParcelDetectionObject } from '@/models/parcel';
import { DEFAULT_DATE_FORMAT } from '@/utils/constants';
import { formatCommune, formatParcel } from '@/utils/format';
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { format } from 'date-fns';
import React from 'react';

const countSuspectObjectsParcel = (parcel: ParcelDetail, excludeObjectUuid?: string): Record<string, number> | null => {
    const suspectObjectsMap: Record<string, number> = {};

    parcel.detectionObjects.forEach((detectionObject) => {
        if (excludeObjectUuid && detectionObject.uuid === excludeObjectUuid) {
            return;
        }

        if (!suspectObjectsMap[detectionObject.objectType.name]) {
            suspectObjectsMap[detectionObject.objectType.name] = 0;
        }

        suspectObjectsMap[detectionObject.objectType.name] += 1;
    });

    if (Object.keys(suspectObjectsMap).length === 0) {
        return null;
    }

    return suspectObjectsMap;
};

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: '32px 16px',
        fontSize: 10,
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '12%',
        width: '100%',
    },
    topSectionLogoContainer: {
        width: '20%',
    },
    topSectionTextContainer: {
        fontSize: 16,
        textAlign: 'center',

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',

        gap: '8px',
    },
    topSectionLogo: {},
    subTitleContainer: {
        marginTop: '6px',
    },
    subTitle: {
        fontFamily: 'Courier-Oblique',
    },
    mainSection: {
        marginTop: '12px',
    },
    tilePreviews: {
        marginTop: '12px',

        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    tilePreviewContainer: {
        marginTop: '8px',
        width: '45%',
    },
    tilePreviewImg: {
        height: 'auto',
        width: '100%',
    },
    tilePreviewTitle: {
        marginTop: '2px',
        width: '100%',
        fontSize: 8,
        textAlign: 'center',
    },
});

export interface PreviewImage {
    index: number;
    src: string;
    title: string;
}

export interface ComponentProps {
    detectionObjects: ParcelDetectionObject[];
    previewImages: PreviewImage[];
    latLong: string;
    parcel: ParcelDetail;
}

// Create Document Component
const Component: React.FC<ComponentProps> = ({ detectionObjects, previewImages, parcel, latLong }) => {
    if (detectionObjects.length === 1) {
    }

    const suspectObjectsCount = parcel ? countSuspectObjectsParcel(parcel) : null;

    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.topSection}>
                <View style={styles.topSectionLogoContainer}>
                    <Image src={republiqueFrancaiseImg} style={styles.topSectionLogo} />
                </View>
                <View style={styles.topSectionTextContainer}>
                    <Text>Fiche de signalement</Text>
                    <Text>
                        {detectionObjects.length === 1
                            ? `Objet détecté ${detectionObjects[0].id}`
                            : `Parcelle ${formatParcel(parcel)}`}
                    </Text>
                </View>
                <View style={styles.topSectionLogoContainer}>
                    <Image src={logoImg} style={styles.topSectionLogo} />
                </View>
            </View>

            <View style={styles.subTitleContainer}>
                <Text style={styles.subTitle}>
                    Potentielle infraction au code de l&apos;urbanisme et/ou de l&apos;environnement
                </Text>
            </View>

            <View style={styles.mainSection}>
                <Text>
                    Commune de{' '}
                    {parcel?.commune ? formatCommune(parcel.commune, 'CODE_AFTER_NAME') : 'Commune non-spécifiée'}
                </Text>
                <Text>Parcelle : {formatParcel(parcel)}</Text>
                <Text>Coordonnées GPS : {latLong}</Text>
                <Text>
                    Zones à enjeux :{' '}
                    {parcel?.customGeoZones.map((zone) => zone.geoCustomZoneCategory?.name || zone.name).join(', ')}
                </Text>
                <Text>Date de la dernière modification : {format(parcel.updatedAt, DEFAULT_DATE_FORMAT)}</Text>
                {suspectObjectsCount ? (
                    <Text>
                        Objets suspects sur la parcelle :{' '}
                        {Object.keys(suspectObjectsCount)
                            .map((key) => `${key} : ${suspectObjectsCount[key]}`)
                            .join(', ')}
                    </Text>
                ) : null}
            </View>

            <View style={styles.tilePreviews}>
                {previewImages.map(({ src, title }, index) => (
                    <View key={index} style={styles.tilePreviewContainer}>
                        <Image src={src} style={styles.tilePreviewImg} />
                        <Text style={styles.tilePreviewTitle}>{title}</Text>
                    </View>
                ))}
            </View>
        </Page>
    );
};

export default Component;
