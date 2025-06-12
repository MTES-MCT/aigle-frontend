import { getGeneratePriorLetterEndpoint } from '@/api-endpoints';
import api from '@/utils/api';
import { useMutation } from '@tanstack/react-query';

const downloadPriorLetter = async (detectionObjectUuid: string) => {
    const response = await api.get<Blob>(getGeneratePriorLetterEndpoint(detectionObjectUuid), {
        responseType: 'blob',
    });

    const blob = new Blob([response.data], {
        type: response.headers['content-type'],
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = 'Courrier préalable.odt'; // fallback filename

    if (contentDisposition) {
        // Parse Content-Disposition header to extract filename
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, ''); // remove quotes
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
        downloadPriorLetter: mutation.mutate,
        isDownloading: mutation.isPending,
        error: mutation.error,
    };
};
