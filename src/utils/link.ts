export const getDetectionObjectLink = (detectionObjectUuid: string, withOrigin: boolean = false) =>
    `${withOrigin ? window.location.origin : ''}/map?detectionObjectUuid=${detectionObjectUuid}`;
