import type { PropsWithChildren } from 'react';
import ActionConfirmationProvider from '@/components/action-confirmation-provider';
/* @chisel-password-confirmation */
import { usePage } from '@inertiajs/react';
import PasswordConfirmationProvider from '@/components/password-confirmation-provider';
/* @end-chisel-password-confirmation */

export default function ConfirmationProvider(props: PropsWithChildren) {
    /* @chisel-password-confirmation */
    const { passwordConfirmation } = usePage<{
        passwordConfirmation: { enabled: boolean };
    }>().props;

    if (passwordConfirmation.enabled) {
        return <PasswordConfirmationProvider {...props} />;
    }
    /* @end-chisel-password-confirmation */

    return <ActionConfirmationProvider {...props} />;
}
