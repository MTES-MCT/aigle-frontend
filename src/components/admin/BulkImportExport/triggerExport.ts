import { ApiError, apiFetchRaw } from '@/utils/api';
import { notifications } from '@mantine/notifications';

export const triggerExport = async (endpoint: string, fallbackName: string, params?: Record<string, unknown>) => {
    try {
        const response = await apiFetchRaw(endpoint, { method: 'GET', params });
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename\*?="?([^";]+)"?/i);
        const filename = match ? decodeURIComponent(match[1]) : fallbackName;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        const apiErr = err as ApiError;
        notifications.show({
            title: 'Erreur',
            message: apiErr?.message || "Erreur lors de l'export",
            color: 'red',
        });
    }
};
