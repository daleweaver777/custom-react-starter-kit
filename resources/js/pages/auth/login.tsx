import { Form, Head } from '@inertiajs/react';
import { useId } from 'react';
import AuthStatus from '@/components/auth-status';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */
import { store } from '@/routes/login';
import { request } from '@/routes/password';
/* @chisel-passkeys */
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const formId = useId();

    return (
        <>
            <Head title="Log in" />

            <AuthStatus>{status}</AuthStatus>

            {/* @chisel-passkeys */}
            <PasskeyVerify />
            {/* @end-chisel-passkeys */}

            <Form
                id={formId}
                onError={(errors) => focusFirstFormError(formId, errors)}
                noValidate
                {...store.form()}
                resetOnError={['password']}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors, clearErrors }) => (
                    <>
                        <FieldGroup>
                            <Field data-invalid={!!errors.email}>
                                <FieldLabel htmlFor="email">
                                    Email address
                                </FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    onChange={() =>
                                        clearFormErrors(
                                            errors,
                                            clearErrors,
                                            'email',
                                        )
                                    }
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="email@example.com"
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
                                    Password
                                </FieldLabel>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    onChange={() =>
                                        clearFormErrors(
                                            errors,
                                            clearErrors,
                                            'password',
                                        )
                                    }
                                    required
                                    autoComplete="current-password"
                                    placeholder="Password"
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

                            <Field orientation="horizontal">
                                <Checkbox id="remember" name="remember" />
                                <FieldLabel htmlFor="remember">
                                    Remember me
                                </FieldLabel>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-sm"
                                    >
                                        Forgot your password?
                                    </TextLink>
                                )}
                            </Field>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                                data-test="login-button"
                            >
                                Log in
                            </Button>
                        </FieldGroup>

                        {/* @chisel-registration */}
                        <div className="text-muted-foreground text-center text-sm">
                            Don't have an account?{' '}
                            <TextLink href={register()}>Sign up</TextLink>
                        </div>
                        {/* @end-chisel-registration */}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
