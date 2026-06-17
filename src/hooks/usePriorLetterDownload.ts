import { utilsEndpoints } from '@/api/endpoints';
import { apiFetchRaw } from '@/utils/api';
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

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
};

export const usePriorLetterDownload = () => {
    const mutation = useMutation({
        mutationFn: downloadPriorLetter,
        onError: (error) => {
            console.error('Error downloading prior letter:', error);
        },
    });

    return {
        downloadPriorLetter: mutation.mutateAsync,
        isDownloading: mutation.isPending,
        error: mutation.error,
    };
};
