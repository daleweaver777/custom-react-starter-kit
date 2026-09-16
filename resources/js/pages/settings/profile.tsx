import { Head, usePage } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import { useId } from 'react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import ChangeEmail from '@/components/change-email';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
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
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
    pendingEmail: string | null;
};

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const formId = useId();

    const { auth, pendingEmail } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your name</CardDescription>
                </CardHeader>

                <Form
                    id={formId}
                    onError={(errors) => focusFirstFormError(formId, errors)}
                    noValidate
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-(--card-spacing)"
                >
                    {({ processing, errors, clearErrors }) => (
                        <>
                            <CardContent className="flex flex-col gap-6">
                                <FieldGroup>
                                    <Field data-invalid={!!errors.name}>
                                        <FieldLabel htmlFor="name">
                                            Name
                                        </FieldLabel>

                                        <Input
                                            id="name"
                                            defaultValue={auth.user.name}
                                            name="name"
                                            onChange={() =>
                                                clearFormErrors(
                                                    errors,
                                                    clearErrors,
                                                    'name',
                                                )
                                            }
                                            required
                                            autoComplete="name"
                                            placeholder="Full name"
                                            aria-invalid={!!errors.name}
                                            aria-describedby={
                                                errors.name
                                                    ? 'name-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="name-error"
                                            message={errors.name}
                                        />
                                    </Field>
                                </FieldGroup>
                            </CardContent>

                            <CardFooter className="justify-end">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>

            <ChangeEmail email={auth.user.email} pendingEmail={pendingEmail}>
                {/* @chisel-email-verification */}
                {mustVerifyEmail && auth.user.email_verified_at === null && (
                    <div>
                        <p className="text-muted-foreground text-sm">
                            Your email address is unverified.{' '}
                            <Link
                                href={send()}
                                as="button"
                                className="text-primary underline underline-offset-4"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <Alert className="mt-2">
                                <AlertDescription>
                                    A new verification link has been sent to
                                    your email address.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
                {/* @end-chisel-email-verification */}
            </ChangeEmail>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
