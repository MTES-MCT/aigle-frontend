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
