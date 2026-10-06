import { utilsEndpoints } from '@/api/endpoints';
import { apiFetchRaw } from '@/utils/api';
import { triggerDownload } from '@/utils/download';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';

const downloadPriorLetter = async (detectionObjectUuid: string) => {
    const response = await apiFetchRaw(utilsEndpoints.generatePriorLetter(detectionObjectUuid));
    const blob = await response.blob();

    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'Courrier préalable.odt';

    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    triggerDownload(blob, filename);
};

// downloadPriorLetter rejects on failure, after this hook has notified the user.
export const usePriorLetterDownload = () => {
    const mutation = useMutation({
        mutationFn: downloadPriorLetter,
        onError: (error) => {
            console.error('Error downloading prior letter:', error);
            notifications.show({
                color: 'red',
                title: 'Erreur lors du téléchargement du courrier préalable',
                message: "Le courrier préalable n'a pas pu être généré, veuillez réessayer.",
            });
        },
    });

    return {
        downloadPriorLetter: mutation.mutateAsync,
        isDownloading: mutation.isPending,
        error: mutation.error,
    };
};
