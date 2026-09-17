import type { RefObject } from 'react';
import { useId } from 'react';
import { ActionButton } from '@/components/action-button';
import PasskeyVerify from '@/components/passkey-verify';
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
import type { ConfirmationOptions } from '@/hooks/use-confirmation';
import {
    index as passkeyOptions,
    store as passkeyStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';

export type PasswordConfirmationDialogState = ConfirmationOptions & {
    needsPassword: boolean;
    canConfirmWithPasskey?: boolean;
};

type PasswordConfirmationDialogProps = {
    dialog: PasswordConfirmationDialogState | null;
    password: string;
    error: string;
    processing: boolean;
    passwordRef: RefObject<HTMLInputElement | null>;
    triggerRef: RefObject<HTMLElement | null>;
    onPasswordChange: (password: string) => void;
    onSubmit: () => Promise<void>;
    onPasskeyVerified: () => Promise<void>;
    onCancel: () => void;
    onClosed: () => void;
};

export default function PasswordConfirmationDialog({
    dialog,
    password,
    error,
    processing,
    passwordRef,
    triggerRef,
    onPasswordChange,
    onSubmit,
    onPasskeyVerified,
    onCancel,
    onClosed,
}: PasswordConfirmationDialogProps) {
    const id = useId();

    return (
        <Dialog
            open={dialog !== null}
            onOpenChange={(open) => {
                if (!open && !processing) onCancel();
            }}
            onOpenChangeComplete={(open) => {
                if (!open) onClosed();
            }}
        >
            <DialogContent showCloseButton={false} finalFocus={triggerRef}>
                <DialogHeader>
                    <DialogTitle>
                        {dialog?.title ?? 'Confirm your identity'}
                    </DialogTitle>
                    <DialogDescription>
                        {dialog?.description ??
                            'Confirm your identity to continue with this security-sensitive action.'}
                    </DialogDescription>
                </DialogHeader>
                {dialog?.needsPassword && dialog.canConfirmWithPasskey && (
                    <PasskeyVerify
                        routes={{
                            options: passkeyOptions(),
                            submit: passkeyStore(),
                        }}
                        label="Confirm with passkey"
                        separator="Or confirm with password"
                        onVerified={onPasskeyVerified}
                    />
                )}
                <form
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void onSubmit();
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
                                    onChange={(event) =>
                                        onPasswordChange(event.target.value)
                                    }
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
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <ActionButton
                            type="submit"
                            pauseWhileConfirming={false}
                            variant={
                                dialog?.destructive ? 'destructive' : 'default'
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
    );
}
