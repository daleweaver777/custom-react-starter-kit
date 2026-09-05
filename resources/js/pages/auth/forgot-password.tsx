import { Form, Head } from '@inertiajs/react';
import AuthStatus from '@/components/auth-status';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            <AuthStatus>{status}</AuthStatus>

            <div className="flex flex-col gap-6">
                <Form {...email.form()} className="flex flex-col gap-6">
                    {({ processing, errors }) => (
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
                                    required
                                    autoFocus
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

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                            >
                                Email password reset link
                            </Button>
                        </FieldGroup>
                    )}
                </Form>

                <div className="text-muted-foreground flex justify-center gap-1 text-center text-sm">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
