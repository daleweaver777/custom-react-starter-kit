import { http, HttpResponseError } from '@inertiajs/core';
import { router, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import PasswordConfirmationDialog from '@/components/password-confirmation-dialog';
import type { PasswordConfirmationDialogState } from '@/components/password-confirmation-dialog';
import { ConfirmationContext } from '@/hooks/use-confirmation';
import type { ConfirmationOptions } from '@/hooks/use-confirmation';
import { reportRequestError } from '@/lib/request-errors';

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
type ConfirmationStatus = {
    confirmed: boolean;
    canConfirmWithPasskey?: boolean;
};

export default function PasswordConfirmationProvider({
    children,
}: PropsWithChildren) {
    const { passwordConfirmation: policy } = usePage<{
        passwordConfirmation: Policy;
    }>().props;
    const [dialog, setDialog] =
        useState<PasswordConfirmationDialogState | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [expiresAt, setExpiresAt] = useState(policy.confirmedUntil);
    const [confirmedUntil, setConfirmedUntil] = useState(policy.confirmedUntil);
    if (confirmedUntil !== policy.confirmedUntil) {
        setConfirmedUntil(policy.confirmedUntil);
        setExpiresAt(policy.confirmedUntil);
    }
    const pending = useRef<Pending | null>(null);
    const pendingFailure = useRef<number | null>(null);
    const trigger = useRef<HTMLElement | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

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

    const checkStatus = useCallback(async (): Promise<ConfirmationStatus> => {
        if (!policy.enabled) return { confirmed: true };
        if (!policy.statusUrl) return { confirmed: false };
        const response = await http.getClient().request({
            method: 'get',
            url: policy.statusUrl,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const status = JSON.parse(response.data) as ConfirmationStatus;
        const elapsed = Number(response.headers['x-retry-after'] ?? 0);
        setExpiresAt(
            status.confirmed
                ? Date.now() + Math.max(0, policy.timeout - elapsed) * 1000
                : 0,
        );
        return status;
    }, [policy.enabled, policy.statusUrl, policy.timeout]);

    const confirm = useCallback(
        (options: ConfirmationOptions = {}): Promise<boolean> => {
            if (pending.current) return Promise.resolve(false);
            return new Promise((resolve) => {
                const request = {
                    resolve,
                    trigger:
                        options.trigger ??
                        (document.activeElement instanceof HTMLElement
                            ? document.activeElement
                            : null),
                };
                pending.current = request;
                trigger.current = request.trigger;
                void (async () => {
                    let status: ConfirmationStatus = { confirmed: false };
                    let failure = '';
                    try {
                        status = await checkStatus();
                    } catch (requestError) {
                        if (pending.current !== request) return;
                        if (handleRequestFailure(requestError)) return;
                        failure =
                            'Unable to check confirmation. Please confirm again or try later.';
                    }
                    if (pending.current !== request) return;
                    if (status.confirmed && !options.always) {
                        finish(true);
                        return;
                    }
                    setError(failure);
                    setDialog({
                        ...options,
                        needsPassword: !status.confirmed,
                        canConfirmWithPasskey: status.canConfirmWithPasskey,
                    });
                })();
            });
        },
        [checkStatus, finish, handleRequestFailure],
    );

    const submit = async () => {
        if (processing || !pending.current) return;
        const request = pending.current;
        return (async () => {
            if (!dialog?.needsPassword) {
                setProcessing(true);
                try {
                    const status = await checkStatus();
                    if (pending.current !== request) return;
                    if (status.confirmed) finish(true);
                    else {
                        setDialog(
                            (current) =>
                                current && {
                                    ...current,
                                    needsPassword: true,
                                    canConfirmWithPasskey:
                                        status.canConfirmWithPasskey,
                                },
                        );
                    }
                } catch (failure) {
                    if (pending.current !== request) return;
                    if (handleRequestFailure(failure)) return;
                    setDialog(
                        (current) =>
                            current && {
                                ...current,
                                needsPassword: true,
                                canConfirmWithPasskey: false,
                            },
                    );
                    setError('Unable to confirm. Please try again.');
                }
                return;
            }
            if (!policy.submitUrl) return;
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
                const { confirmed } = await checkStatus();
                if (pending.current === request) {
                    if (confirmed) finish(true);
                    else {
                        setPassword('');
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
                requestAnimationFrame(() => passwordRef.current?.focus());
            }
        })().finally(() => {
            if (pending.current === request) setProcessing(false);
        });
    };

    const currentRequest = pending.current;
    const handlePasskeyVerified = () => {
        return checkStatus()
            .then(({ confirmed }) => {
                if (confirmed && pending.current === currentRequest)
                    finish(true);
            })
            .catch((failure) => {
                if (pending.current !== currentRequest) return;
                if (!handleRequestFailure(failure)) {
                    setError('Unable to confirm. Please try again.');
                }
            });
    };

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
            <PasswordConfirmationDialog
                dialog={dialog}
                password={password}
                error={error}
                processing={processing}
                passwordRef={passwordRef}
                triggerRef={trigger}
                onPasswordChange={(value) => {
                    setPassword(value);
                    setError('');
                }}
                onSubmit={submit}
                onPasskeyVerified={handlePasskeyVerified}
                onCancel={() => finish(false)}
                onClosed={() => {
                    if (pendingFailure.current !== null) {
                        reportRequestError(pendingFailure.current);
                        pendingFailure.current = null;
                    }
                }}
            />
        </ConfirmationContext>
    );
}
