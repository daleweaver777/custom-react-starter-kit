import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
            setError({ ...error, id: ++nextId });
        };

        const removeNetworkListener = router.on('networkError', () => {
            showError({
                title: 'Connection problem',
                description: 'Check your internet connection and try again.',
            });

            return false;
        });

        const removeHttpListener = router.on('httpException', ({ detail }) => {
            const status = detail.response.status;

            if (status < 400) {
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

            return false;
        });

        return () => {
            removeNetworkListener();
            removeHttpListener();
        };
    }, []);

    return { error, dismiss: () => setError(null) };
}
