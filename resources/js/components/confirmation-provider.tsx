import { ActionButton } from '@/components/action-button';
import { http, HttpResponseError } from '@inertiajs/core';
import { router, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { ConfirmationContext } from '@/hooks/use-confirmation';
import type { ConfirmationOptions } from '@/hooks/use-confirmation';
import { reportRequestError } from '@/lib/request-errors';
/* @chisel-password-confirmation */
/* @chisel-passkeys */
import {
    index as passkeyOptions,
    store as passkeyStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */
/* @end-chisel-password-confirmation */

type Policy = {
    enabled: boolean;
    timeout: number;
    confirmedUntil: number;
    statusUrl: string | null;
    submitUrl: string | null;
};
type Pending = {
    resolve: (confirmed: boolean) => void;
    trigger: HTMLElement | null;
};

export default function ConfirmationProvider({ children }: PropsWithChildren) {
    const { passwordConfirmation: policy } = usePage<{
        passwordConfirmation: Policy;
    }>().props;
    const [dialog, setDialog] = useState<
        (ConfirmationOptions & { needsPassword: boolean }) | null
    >(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [expiresAt, setExpiresAt] = useState(policy.confirmedUntil);
    useEffect(
        () => setExpiresAt(policy.confirmedUntil),
        [policy.confirmedUntil],
    );
    const pending = useRef<Pending | null>(null);
    const pendingFailure = useRef<number | null>(null);
    const trigger = useRef<HTMLElement | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const id = useId();

    const finish = useCallback((confirmed: boolean) => {
        const request = pending.current;
        pending.current = null;
        setDialog(null);
        setPassword('');
        setError('');
        setProcessing(false);
        request?.resolve(confirmed);
    }, []);

    const handleRequestFailure = useCallback(
        (failure: unknown) => {
            const status =
                failure instanceof HttpResponseError
                    ? failure.response.status
                    : failure instanceof SyntaxError
                      ? 500
                      : 0;
            if (status === 422) return false;
            if (dialog) pendingFailure.current = status;
            else reportRequestError(status);
            finish(false);
            return true;
        },
        [dialog, finish],
    );

    useEffect(() => {
        const removeListener = router.on('navigate', () => finish(false));
        return () => {
            removeListener();
            pending.current?.resolve(false);
            pending.current = null;
        };
    }, [finish]);

    const checkStatus = useCallback(async () => {
        if (!policy.enabled) return true;
        if (!policy.statusUrl) return false;
        const response = await http.getClient().request({
            method: 'get',
            url: policy.statusUrl,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const { confirmed } = JSON.parse(response.data) as {
            confirmed: boolean;
        };
        const elapsed = Number(response.headers['x-retry-after'] ?? 0);
        setExpiresAt(
            confirmed
                ? Date.now() + Math.max(0, policy.timeout - elapsed) * 1000
                : 0,
        );
        return confirmed;
    }, [policy.enabled, policy.statusUrl, policy.timeout]);

    const confirm = useCallback(
        (options: ConfirmationOptions = {}): Promise<boolean> => {
            if (pending.current) return Promise.resolve(false);
            return new Promise((resolve) => {
                const request = {
                    resolve,
                    trigger:
                        document.activeElement instanceof HTMLElement
                            ? document.activeElement
                            : null,
                };
                pending.current = request;
                trigger.current = request.trigger;
                void (async () => {
                    let confirmed = false;
                    let failure = '';
                    try {
                        confirmed = await checkStatus();
                    } catch (requestError) {
                        if (pending.current !== request) return;
                        if (handleRequestFailure(requestError)) return;
                        failure =
                            'Unable to check confirmation. Please confirm again or try later.';
                    }
                    if (pending.current !== request) return;
                    if (confirmed && !options.always) {
                        finish(true);
                        return;
                    }
                    setError(failure);
                    setDialog({ ...options, needsPassword: !confirmed });
                })();
            });
        },
        [checkStatus, finish, handleRequestFailure],
    );

    const submit = async () => {
        if (processing || !pending.current) return;
        if (!dialog?.needsPassword) {
            const request = pending.current;
            setProcessing(true);
            try {
                const confirmed = await checkStatus();
                if (pending.current !== request) return;
                if (confirmed) finish(true);
                else {
                    setDialog(
                        (current) =>
                            current && { ...current, needsPassword: true },
                    );
                    setProcessing(false);
                }
            } catch (failure) {
                if (pending.current !== request) return;
                if (handleRequestFailure(failure)) return;
                setDialog(
                    (current) => current && { ...current, needsPassword: true },
                );
                setError('Unable to confirm. Please try again.');
                setProcessing(false);
            }
            return;
        }
        if (!policy.submitUrl) return;
        const request = pending.current;
        setProcessing(true);
        setError('');
        try {
            await http.getClient().request({
                method: 'post',
                url: policy.submitUrl,
                data: { password },
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (pending.current !== request) return;
            const confirmed = await checkStatus();
            if (pending.current === request) {
                if (confirmed) finish(true);
                else {
                    setPassword('');
                    setProcessing(false);
                    setError('Please confirm again to continue.');
                }
            }
        } catch (failure) {
            if (pending.current !== request) return;
            if (handleRequestFailure(failure)) return;
            const status =
                failure instanceof HttpResponseError
                    ? failure.response.status
                    : 0;
            let validationMessage: string | undefined;
            if (failure instanceof HttpResponseError && status === 422) {
                try {
                    const response = JSON.parse(failure.response.data);
                    const messages = response.errors?.password;
                    const message = Array.isArray(messages)
                        ? messages[0]
                        : messages;
                    if (typeof message === 'string')
                        validationMessage = message;
                } catch {
                    // Keep the dialog usable if a proxy returns a non-JSON response.
                }
            }
            setError(
                validationMessage ?? 'Unable to confirm. Please try again.',
            );
            setPassword('');
            setProcessing(false);
            requestAnimationFrame(() => passwordRef.current?.focus());
        }
    };

    /* @chisel-password-confirmation */
    /* @chisel-passkeys */
    const currentRequest = pending.current;
    /* @end-chisel-passkeys */
    /* @end-chisel-password-confirmation */

    return (
        <ConfirmationContext
            value={{
                confirm,
                enabled: policy.enabled,
                expiresAt,
                prompting: dialog !== null,
            }}
        >
            {children}
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open && !processing) finish(false);
                }}
                onOpenChangeComplete={(open) => {
                    if (!open && pendingFailure.current !== null) {
                        reportRequestError(pendingFailure.current);
                        pendingFailure.current = null;
                    }
                }}
            >
                <DialogContent showCloseButton={false} finalFocus={trigger}>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.title ?? 'Confirm your identity'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.description ??
                                'Confirm your identity to continue with this security-sensitive action.'}
                        </DialogDescription>
                    </DialogHeader>
                    {/* @chisel-password-confirmation */}
                    {/* @chisel-passkeys */}
                    {dialog?.needsPassword && (
                        <PasskeyVerify
                            routes={{
                                options: passkeyOptions(),
                                submit: passkeyStore(),
                            }}
                            label="Confirm with passkey"
                            separator="Or confirm with password"
                            onVerified={() => {
                                return checkStatus()
                                    .then((confirmed) => {
                                        if (
                                            confirmed &&
                                            pending.current === currentRequest
                                        )
                                            finish(true);
                                    })
                                    .catch((failure) => {
                                        if (pending.current !== currentRequest)
                                            return;
                                        if (!handleRequestFailure(failure)) {
                                            setError(
                                                'Unable to confirm. Please try again.',
                                            );
                                        }
                                    });
                            }}
                        />
                    )}
                    {/* @end-chisel-passkeys */}
                    {/* @end-chisel-password-confirmation */}
                    <form
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submit();
                        }}
                        className="flex flex-col gap-4"
                    >
                        {dialog?.needsPassword && (
                            <FieldGroup>
                                <Field data-invalid={!!error}>
                                    <FieldLabel htmlFor={id}>
                                        Current password
                                    </FieldLabel>
                                    <PasswordInput
                                        ref={passwordRef}
                                        id={id}
                                        name="password"
                                        value={password}
                                        onChange={(event) => {
                                            setPassword(event.target.value);
                                            setError('');
                                        }}
                                        autoComplete="current-password"
                                        autoFocus
                                        required
                                        disabled={processing}
                                        aria-invalid={!!error}
                                        aria-describedby={
                                            error ? `${id}-error` : undefined
                                        }
                                    />
                                    <FieldError id={`${id}-error`}>
                                        {error}
                                    </FieldError>
                                </Field>
                            </FieldGroup>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => finish(false)}
                            >
                                Cancel
                            </Button>
                            <ActionButton
                                type="submit"
                                pauseWhileConfirming={false}
                                variant={
                                    dialog?.destructive
                                        ? 'destructive'
                                        : 'default'
                                }
                                disabled={processing}
                                pending={processing}
                            >
                                {dialog?.actionLabel ?? 'Confirm and continue'}
                            </ActionButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </ConfirmationContext>
    );
}
