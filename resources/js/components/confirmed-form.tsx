import type { FormComponentRef } from '@inertiajs/core';
import { Form } from '@/components/inertia-form';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import type { ConfirmationOptions } from '@/hooks/use-confirmation';

export default function ConfirmedForm({
    confirmation,
    validateBeforeConfirm,
    onConfirmed,
    children,
    ...props
}: ComponentProps<typeof Form<Record<string, string>>> & {
    confirmation?: ConfirmationOptions;
    validateBeforeConfirm?: string[];
    onConfirmed?: (data: Record<string, string>) => void | Promise<void>;
}) {
    const form = useRef<FormComponentRef<Record<string, string>>>(null);
    const waiting = useRef(false);
    const [checking, setChecking] = useState(false);
    const validationRequest = useRef<AbortController | null>(null);
    useEffect(() => () => validationRequest.current?.abort(), []);
    const { confirm } = useConfirmation();

    return (
        <Form
            {...props}
            ref={form}
            onSubmitCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (waiting.current) return;

                const currentForm = form.current;
                if (!currentForm) return;
                const submittedData = JSON.stringify(currentForm.getData());
                const submitter = (event.nativeEvent as SubmitEvent).submitter;
                const trigger =
                    submitter instanceof HTMLElement ? submitter : null;
                waiting.current = true;
                setChecking(true);
                void (async () => {
                    if (validateBeforeConfirm?.length) {
                        validationRequest.current = new AbortController();
                        let valid = false;
                        let invalid = false;
                        await new Promise<void>((resolve) => {
                            currentForm.validate({
                                only: validateBeforeConfirm,
                                signal: validationRequest.current!.signal,
                                onPrecognitionSuccess: () => {
                                    valid = true;
                                },
                                onValidationError: () => {
                                    invalid = true;
                                },
                                onFinish: resolve,
                            });
                        });
                        if (!form.current) return;
                        if (!valid) {
                            if (!invalid) {
                                currentForm.setError(
                                    validateBeforeConfirm[0],
                                    'Unable to validate right now. Please try again.',
                                );
                            }
                            const errors = currentForm.validator().errors();
                            props.onError?.(
                                Object.fromEntries(
                                    Object.entries(errors).map(
                                        ([name, messages]) => [
                                            name,
                                            messages[0],
                                        ],
                                    ),
                                ),
                            );
                            return;
                        }
                    }
                    if (
                        !form.current ||
                        JSON.stringify(form.current.getData()) !== submittedData
                    )
                        return;
                    if (await confirm({ ...confirmation, trigger })) {
                        if (
                            form.current &&
                            JSON.stringify(form.current.getData()) ===
                                submittedData
                        ) {
                            if (onConfirmed) {
                                await onConfirmed(form.current.getData());
                            } else {
                                form.current.submit();
                            }
                        }
                    }
                })().finally(() => {
                    waiting.current = false;
                    setChecking(false);
                });
            }}
        >
            {(state) =>
                typeof children === 'function'
                    ? children({
                          ...state,
                          processing: state.processing || checking,
                      })
                    : children
            }
        </Form>
    );
}
