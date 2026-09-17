import { useEffect, useState } from 'react';
import { LOADING_DELAY } from '@/lib/loading';

export function useActionLoading(pending: boolean) {
    const [visible, setVisible] = useState(false);

    if (!pending && visible) {
        setVisible(false);
    }

    useEffect(() => {
        if (!pending) return;

        const timeout = setTimeout(() => setVisible(true), LOADING_DELAY);
        return () => clearTimeout(timeout);
    }, [pending]);

    return pending && (LOADING_DELAY === 0 || visible);
}
