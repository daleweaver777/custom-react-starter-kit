import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useRef, useState, type ComponentProps } from 'react';
import { ActionButton } from '@/components/action-button';

// For mutations presented as links or menu items rather than a form.
export function RequestButton({
    action,
    beforeRequest,
    ...props
}: Omit<ComponentProps<typeof ActionButton>, 'pending' | 'onClick'> & {
    action: UrlMethodPair;
    beforeRequest?: () => void;
}) {
    const locked = useRef(false);
    const [pending, setPending] = useState(false);
    return (
        <ActionButton
            {...props}
            type="button"
            pending={pending}
            onClick={() => {
                if (locked.current) return;
                locked.current = true;
                setPending(true);
                beforeRequest?.();
                router.visit(action, {
                    preserveScroll: true,
                    onFinish: () => {
                        locked.current = false;
                        setPending(false);
                    },
                });
            }}
        />
    );
}
