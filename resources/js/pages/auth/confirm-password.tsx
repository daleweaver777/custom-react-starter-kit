import { Head } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import { useId } from 'react';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
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

export default function ConfirmPassword() {
    const formId = useId();

    return (
        <>
            <Head title="Confirm password" />

            {/* @chisel-passkeys */}
            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming…"
                separator="Or confirm with password"
            />
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

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            Confirm password
                        </Button>
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
