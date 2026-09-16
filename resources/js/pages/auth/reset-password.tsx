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
import { Input } from '@/components/ui/input';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    const formId = useId();

    return (
        <>
            <Head title="Reset password" />

            <Form
                id={formId}
                onError={(errors) => focusFirstFormError(formId, errors)}
                noValidate
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnError={['password', 'password_confirmation']}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors, clearErrors }) => (
                    <FieldGroup>
                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="email">
                                Email address
                            </FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                readOnly
                                aria-invalid={!!errors.email}
                                aria-describedby={
                                    errors.email ? 'email-error' : undefined
                                }
                            />
                            <FieldError id="email-error">
                                {errors.email}
                            </FieldError>
                        </Field>

                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="password">
                                New password
                            </FieldLabel>
                            <PasswordInput
                                id="password"
                                required
                                name="password"
                                onChange={() =>
                                    clearFormErrors(
                                        errors,
                                        clearErrors,
                                        'password',
                                        'password_confirmation',
                                    )
                                }
                                autoComplete="new-password"
                                autoFocus
                                placeholder="New password"
                                passwordrules={passwordRules}
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

                        <Field data-invalid={!!errors.password_confirmation}>
                            <FieldLabel htmlFor="password_confirmation">
                                Confirm password
                            </FieldLabel>
                            <PasswordInput
                                id="password_confirmation"
                                required
                                name="password_confirmation"
                                onChange={() =>
                                    clearFormErrors(
                                        errors,
                                        clearErrors,
                                        'password_confirmation',
                                    )
                                }
                                autoComplete="new-password"
                                placeholder="Confirm password"
                                passwordrules={passwordRules}
                                aria-invalid={!!errors.password_confirmation}
                                aria-describedby={
                                    errors.password_confirmation
                                        ? 'password-confirmation-error'
                                        : undefined
                                }
                            />
                            <FieldError id="password-confirmation-error">
                                {errors.password_confirmation}
                            </FieldError>
                        </Field>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            Reset password
                        </Button>
                    </FieldGroup>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Reset password',
    description: 'Please enter your new password below',
};
