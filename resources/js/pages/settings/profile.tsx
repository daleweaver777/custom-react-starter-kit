import { Form, Head, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
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
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
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
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Update your name and email address
                    </CardDescription>
                </CardHeader>

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-(--card-spacing)"
                >
                    {({ processing, errors }) => (
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

                                    <Field data-invalid={!!errors.email}>
                                        <FieldLabel htmlFor="email">
                                            Email address
                                        </FieldLabel>

                                        <Input
                                            id="email"
                                            type="email"
                                            defaultValue={auth.user.email}
                                            name="email"
                                            required
                                            autoComplete="username"
                                            placeholder="Email address"
                                            aria-invalid={!!errors.email}
                                            aria-describedby={
                                                errors.email
                                                    ? 'email-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="email-error"
                                            message={errors.email}
                                        />
                                    </Field>
                                </FieldGroup>

                                {/* @chisel-email-verification */}
                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="text-muted-foreground text-sm">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-primary underline underline-offset-4"
                                                >
                                                    Click here to re-send the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <Alert className="mt-2">
                                                    <AlertDescription>
                                                        A new verification link
                                                        has been sent to your
                                                        email address.
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    )}
                                {/* @end-chisel-email-verification */}
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
