import { ActionButton } from '@/components/action-button';
import { Head } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import { useId } from 'react';
import PasswordInput from '@/components/password-input';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';
import { store } from '@/routes/password/confirm';
/* @chisel-passkeys */
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

export default function ConfirmPassword(
    /* @chisel-passkeys */
    { canConfirmWithPasskey = false }: { canConfirmWithPasskey?: boolean },
    /* @end-chisel-passkeys */
) {
    const formId = useId();

    return (
        <>
            <Head title="Confirm password" />

            {/* @chisel-passkeys */}
            {canConfirmWithPasskey && (
                <PasskeyVerify
                    routes={{
                        options: confirmOptions(),
                        submit: confirmStore(),
                    }}
                    label="Confirm with passkey"
                    separator="Or confirm with password"
                />
            )}
            {/* @end-chisel-passkeys */}

            <Form
                id={formId}
                onError={(errors) => focusFirstFormError(formId, errors)}
                noValidate
                {...store.form()}
                resetOnError={['password']}
                resetOnSuccess={['password']}
            >
                {({ processing, errors, clearErrors }) => (
                    <FieldGroup>
                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <PasswordInput
                                id="password"
                                required
                                name="password"
                                onChange={() =>
                                    clearFormErrors(
                                        errors,
                                        clearErrors,
                                        'password',
                                    )
                                }
                                placeholder="Password"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={!!errors.password}
                                aria-describedby={
                                    errors.password
                                        ? 'password-error'
                                        : undefined
                                }
                            />
                            <FieldError id="password-error">
                                {errors.password}
                            </FieldError>
                        </Field>

                        <ActionButton
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="confirm-password-button"
                            pending={processing}
                        >
                            Confirm password
                        </ActionButton>
                    </FieldGroup>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirm password',
    description:
        'This is a secure area of the application. Please confirm your password before continuing.',
};
