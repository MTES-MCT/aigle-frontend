import { DetectionWithTile } from '@/models/detection';
import { DetectionObjectDetail } from '@/models/detection-object';
import { trackEvent, trackEventOnce } from '@/utils/matomo';
import { useMatch } from 'react-router-dom';

interface DetectionTracking {
    trackEvent: typeof trackEvent;
    trackEventOnce: typeof trackEventOnce;
}

const TRACKING: DetectionTracking = { trackEvent, trackEventOnce };
const NO_TRACKING: DetectionTracking = { trackEvent: () => undefined, trackEventOnce: () => undefined };

// The tile set form's preview map renders this panel too, without any 'Fiche ouverte': only the real map is tracked.
export const useDetectionTracking = (): DetectionTracking => (useMatch('/map') ? TRACKING : NO_TRACKING);

// One slot, set beside each 'Fiche ouverte' event and cleared when the panel reads it: the panel
// reports its blockers for an object the agent just opened, never after a save, a re-click or a replay.
let openedDetectionObjectUuid: string | null = null;

export const markDetectionObjectOpened = (detectionObjectUuid: string) => {
    openedDetectionObjectUuid = detectionObjectUuid;
};

export const consumeDetectionObjectOpened = (detectionObjectUuid: string): boolean => {
    if (openedDetectionObjectUuid !== detectionObjectUuid) {
        return false;
    }

    openedDetectionObjectUuid = null;
    return true;
};

// What keeps the agent from acting on the object: 'Aucun droit' means the object is outside every group zone.
export const getDetectionObjectBlockers = (
    detectionObject: DetectionObjectDetail,
    detection: DetectionWithTile,
): string[] => {
    const blockers: string[] = [];

    if (!detectionObject.userGroupRights.length) {
        blockers.push('Aucun droit');
    } else if (!detectionObject.userGroupRights.includes('WRITE')) {
        blockers.push('Lecture seule');
    }

    if (!detectionObject.parcel?.uuid) {
        blockers.push('Sans parcelle');
    }

    if (detection.detectionData.detectionValidationStatusChangeReason === 'SITADEL') {
        blockers.push('Verrou SITADEL');
    }

    return blockers;
};
