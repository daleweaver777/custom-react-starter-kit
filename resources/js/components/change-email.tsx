import { Form } from '@/components/inertia-form';
import { useId, type ReactNode } from 'react';
import EmailChangeController from '@/actions/App/Http/Controllers/Settings/EmailChangeController';
import InputError from '@/components/input-error';
import ConfirmedForm from '@/components/confirmed-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';

export default function ChangeEmail({
    email,
    pendingEmail,
    children,
}: {
    email: string;
    pendingEmail: string | null;
    children?: ReactNode;
}) {
    const formId = useId();

    if (pendingEmail) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Email address</CardTitle>
                    <CardDescription>
                        Confirm your new email address to finish this change.
                    </CardDescription>
                </CardHeader>
                <Form
                    {...EmailChangeController.destroy.form()}
                    options={{ preserveScroll: true }}
                    className="flex flex-col gap-(--card-spacing)"
                >
                    {({ processing }) => (
                        <>
                            <CardContent>
                                <Alert>
                                    <AlertDescription>
                                        Open the verification link sent to{' '}
                                        {pendingEmail}. It expires 30 minutes
                                        after your request. Your sign-in address
                                        remains {email} until you confirm.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                            <CardFooter className="justify-end">
                                <Button type="submit" disabled={processing}>
                                    Cancel email change
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email address</CardTitle>
                <CardDescription>
                    Your current sign-in and recovery address is {email}. Verify
                    your new address before using it for your account.
                </CardDescription>
            </CardHeader>

            {children && <CardContent>{children}</CardContent>}

            <ConfirmedForm
                id={formId}
                validateBeforeConfirm={['email']}
                {...EmailChangeController.store.form()}
                onError={(errors) => focusFirstFormError(formId, errors)}
                noValidate
                resetOnSuccess={['email']}
                options={{ preserveScroll: true }}
                className="flex flex-col gap-(--card-spacing)"
            >
                {({ processing, errors, clearErrors }) => (
                    <>
                        <CardContent>
                            <FieldGroup>
                                <Field data-invalid={!!errors.email}>
                                    <FieldLabel htmlFor="new-email">
                                        New email address
                                    </FieldLabel>
                                    <Input
                                        id="new-email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        placeholder="New email address"
                                        onChange={() =>
                                            clearFormErrors(
                                                errors,
                                                clearErrors,
                                                'email',
                                            )
                                        }
                                        aria-invalid={!!errors.email}
                                        aria-describedby={
                                            errors.email
                                                ? 'new-email-error'
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        id="new-email-error"
                                        message={errors.email}
                                    />
                                </Field>
                            </FieldGroup>
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button type="submit" disabled={processing}>
                                Send verification link
                            </Button>
                        </CardFooter>
                    </>
                )}
            </ConfirmedForm>
        </Card>
    );
}
