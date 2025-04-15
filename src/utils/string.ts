export const getColorFromString = (text: string): string => {
    let hash = 0;

    if (text.length === 0) {
        return '#808080';
    }
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 255;
        color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
};

export const getEmailInitials = (email: string): string => {
    try {
        const namePart = email.split('@')[0];
        const nameParts = namePart.split('.');
        const initials = nameParts.map((part) => part[0].toUpperCase()).join('');

        return initials.slice(0, 3);
    } catch {}

    return '';
};

export const stringToBoolean = (text?: string, defaultValue: boolean | null = false): boolean | null => {
    const textLower = (text || '').toLowerCase();

    if (textLower === 'null') {
        return null;
    }

    try {
        return Boolean(JSON.parse((textLower || String(defaultValue)).toLowerCase()));
    } catch {
        return defaultValue;
    }
};

export const stringToArray = (text?: string, separator = ','): string[] | undefined => {
    if (text === undefined) {
        return undefined;
    }

    if (!text) {
        return [];
    }

    return text.split(separator);
};

export const stringToTypedArray = <T_OUTPUT = string>(
    validValues: readonly T_OUTPUT[],
    text?: string,
    separator = ',',
): T_OUTPUT[] | undefined => {
    const arrayStringWithDuplicates = stringToArray(text, separator);

    if (!arrayStringWithDuplicates) {
        return arrayStringWithDuplicates;
    }

    const arrayString = [...new Set(arrayStringWithDuplicates)];

    return arrayString.filter((strElement) => validValues.includes(strElement as T_OUTPUT)) as T_OUTPUT[];
};

export const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
