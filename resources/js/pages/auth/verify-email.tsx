import { Head } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import AuthStatus from '@/components/auth-status';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            <AuthStatus>
                {status === 'verification-link-sent' &&
                    'A new verification link has been sent to the email address you provided during registration.'}
            </AuthStatus>

            <Form
                noValidate
                {...send.form()}
                className="flex flex-col gap-6 text-center"
            >
                {({ processing }) => (
                    <>
                        <Button
                            type="submit"
                            disabled={processing}
                            variant="secondary"
                        >
                            Resend verification email
                        </Button>

                        <div className="flex flex-col gap-1 text-sm">
                            <p className="text-muted-foreground">
                                Wrong email address?
                            </p>
                            <TextLink href={edit()}>
                                Change email address
                            </TextLink>
                        </div>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Log out
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
