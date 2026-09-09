import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from '@/components/ui/toast';

export function useRequestErrors(): void {
    useEffect(() => {
        const removeNetworkListener = router.on('networkError', () => {
            toast.add({
                id: 'request-error',
                type: 'error',
                title: 'Connection problem',
                description: 'Check your internet connection and try again.',
                timeout: 5000,
                actionProps: undefined,
            });

            return false;
        });

        const removeHttpListener = router.on('httpException', ({ detail }) => {
            const status = detail.response.status;

            if (status < 400) {
                return;
            }

            if (status === 419) {
                toast.add({
                    id: 'request-error',
                    type: 'error',
                    title: 'Session expired',
                    description:
                        'Refresh the page before trying again. Unsaved changes will be lost.',
                    timeout: 0,
                    actionProps: {
                        children: 'Refresh',
                        onClick: () => window.location.reload(),
                    },
                });
            } else {
                toast.add({
                    id: 'request-error',
                    type: 'error',
                    title:
                        status === 429
                            ? 'Too many requests'
                            : 'Something went wrong',
                    description:
                        status === 429
                            ? 'Please wait a moment before trying again.'
                            : 'Unable to complete your request. Please try again.',
                    timeout: 5000,
                    actionProps: undefined,
                });
            }

            return false;
        });

        return () => {
            removeNetworkListener();
            removeHttpListener();
        };
    }, []);
}
