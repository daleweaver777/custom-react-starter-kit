import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { ActionButton } from '@/components/action-button';
import { FieldError, FieldSeparator } from '@/components/ui/field';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    separator?: string;
    onVerified?: () => void | Promise<void>;
};

export default function PasskeyVerify({
    routes,
    label,
    separator,
    onVerified,
}: Props = {}) {
    const [pending, setPending] = useState(false);
    const followUp = useRef<Promise<void> | null>(null);
    const { verify, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            followUp.current = onVerified
                ? Promise.resolve(onVerified())
                : new Promise<void>((resolve) =>
                      router.visit(response.redirect ?? '/dashboard', {
                          onFinish: () => resolve(),
                      }),
                  );
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="grid gap-2">
                <ActionButton
                    pending={pending}
                    pauseWhileConfirming={false}
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        if (pending) return;
                        setPending(true);
                        followUp.current = null;
                        void (async () => {
                            try {
                                await verify();
                                await followUp.current;
                            } finally {
                                setPending(false);
                            }
                        })();
                    }}
                >
                    <KeyRound data-icon="inline-start" />
                    {label ?? 'Sign in with a passkey'}
                </ActionButton>
                {pending && (
                    <p
                        role="status"
                        className="text-muted-foreground text-center text-sm"
                    >
                        Complete the passkey prompt on your device.
                    </p>
                )}
                <FieldError className="text-center">{error}</FieldError>
            </div>

            <FieldSeparator>
                {separator ?? 'Or continue with email'}
            </FieldSeparator>
        </>
    );
}
