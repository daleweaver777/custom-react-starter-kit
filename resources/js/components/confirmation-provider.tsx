import type { PropsWithChildren } from 'react';
import ActionConfirmationProvider from '@/components/action-confirmation-provider';
import { usePage } from '@inertiajs/react';
import PasswordConfirmationProvider from '@/components/password-confirmation-provider';

export default function ConfirmationProvider(props: PropsWithChildren) {
    const { passwordConfirmation } = usePage<{
        passwordConfirmation: { enabled: boolean };
    }>().props;

    if (passwordConfirmation.enabled) {
        return <PasswordConfirmationProvider {...props} />;
    }

    return <ActionConfirmationProvider {...props} />;
}
