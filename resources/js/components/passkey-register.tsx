import { ActionButton } from '@/components/action-button';
import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Info } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import PasskeyRegistrationController from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import ConfirmedForm from '@/components/confirmed-form';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { focusFirstFormError } from '@/lib/utils';

type Props = {
    onSuccess: () => Promise<void>;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const formId = useId();
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const [name, setName] = useState(() => {
        const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' on ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const followUp = useRef<Promise<void> | null>(null);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            followUp.current = onSuccess().then(() => {
                setName('');
                setShowForm(false);
                requestAnimationFrame(() => addButtonRef.current?.focus());
            });
        },
    });

    const handleCancel = () => {
        setShowForm(false);
        setName('');
        requestAnimationFrame(() => addButtonRef.current?.focus());
    };

    if (!isSupported) {
        return (
            <Alert className="w-full">
                <Info />
                <AlertDescription>
                    Passkeys are not supported in this browser.
                </AlertDescription>
            </Alert>
        );
    }

    if (!showForm) {
        return (
            <Button
                ref={addButtonRef}
                variant="outline"
                onClick={() => setShowForm(true)}
            >
                Add passkey
            </Button>
        );
    }

    return (
        <ConfirmedForm
            {...PasskeyRegistrationController.store.form()}
            id={formId}
            noValidate
            validateBeforeConfirm={['name']}
            onConfirmed={async (data) => {
                followUp.current = null;
                await register(data.name.trim());
                await Promise.resolve(followUp.current);
            }}
            onError={(errors) => focusFirstFormError(formId, errors)}
            className="flex w-full flex-col gap-4"
        >
            {({ errors, clearErrors, processing }) => {
                const nameError = errors.name ?? error ?? undefined;
                return (
                    <>
                        <FieldGroup>
                            <Field data-invalid={!!nameError}>
                                <FieldLabel htmlFor="passkey-name">
                                    Passkey name
                                </FieldLabel>
                                <Input
                                    id="passkey-name"
                                    type="text"
                                    required
                                    name="name"
                                    aria-describedby={
                                        nameError
                                            ? 'passkey-name-description passkey-name-error'
                                            : 'passkey-name-description'
                                    }
                                    value={name}
                                    disabled={isLoading}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        clearErrors('name');
                                    }}
                                    placeholder="e.g., MacBook Pro, iPhone"
                                    className="bg-background"
                                    autoFocus
                                    aria-invalid={!!nameError}
                                />
                                <FieldDescription id="passkey-name-description">
                                    A name helps you identify this passkey
                                    later.
                                </FieldDescription>
                                <InputError
                                    id="passkey-name-error"
                                    message={nameError}
                                />
                            </Field>
                        </FieldGroup>

                        <div className="flex gap-2">
                            <ActionButton
                                type="submit"
                                disabled={isLoading || processing}
                                pending={processing}
                            >
                                Register passkey
                            </ActionButton>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isLoading || processing}
                            >
                                Cancel
                            </Button>
                        </div>
                        {isLoading && (
                            <p
                                role="status"
                                className="text-muted-foreground text-sm"
                            >
                                Complete the passkey prompt on your device.
                            </p>
                        )}
                    </>
                );
            }}
        </ConfirmedForm>
    );
}
