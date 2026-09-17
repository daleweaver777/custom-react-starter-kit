import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { onRequestError, reportRequestError } from '@/lib/request-errors';

type RequestError = {
    id: number;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
};

export function useRequestErrors() {
    const [error, setError] = useState<RequestError | null>(null);

    useEffect(() => {
        let nextId = 0;
        const showError = (error: Omit<RequestError, 'id'>) => {
            nextId += 1;
            setError({ ...error, id: nextId });
        };

        const removeReportedListener = onRequestError((status) => {
            if (status === 0) {
                showError({
                    title: 'Connection problem',
                    description:
                        'Check your internet connection and try again.',
                });
                return;
            }

            if (status === 419) {
                showError({
                    title: 'Session expired',
                    description:
                        'Refresh the page before trying again. Unsaved changes will be lost.',
                    action: {
                        label: 'Refresh',
                        onClick: () => window.location.reload(),
                    },
                });
            } else {
                showError({
                    title:
                        status === 429
                            ? 'Too many requests'
                            : 'Something went wrong',
                    description:
                        status === 429
                            ? 'Please wait a moment before trying again.'
                            : 'Unable to complete your request. Please try again.',
                });
            }
        });

        const removeNetworkListener = router.on('networkError', () => {
            reportRequestError(0);
            return false;
        });
        const removeHttpListener = router.on('httpException', ({ detail }) => {
            const status = detail.response.status;
            if (status < 400) return;
            // Validation belongs to the form; Inertia validation redirects use
            // the separate error event, and raw 422 responses are excluded too.
            reportRequestError(status);
            return false;
        });

        return () => {
            removeReportedListener();
            removeNetworkListener();
            removeHttpListener();
        };
    }, []);

    return { error, dismiss: () => setError(null) };
}
