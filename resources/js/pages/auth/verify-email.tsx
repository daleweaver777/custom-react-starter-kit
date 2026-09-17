import { ActionButton } from '@/components/action-button';
import { Head } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import AuthStatus from '@/components/auth-status';
import TextLink from '@/components/text-link';
import { RequestButton } from '@/components/request-button';
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
                        <ActionButton
                            type="submit"
                            disabled={processing}
                            variant="secondary"
                            pending={processing}
                        >
                            Resend verification email
                        </ActionButton>

                        <div className="flex flex-col gap-1 text-sm">
                            <p className="text-muted-foreground">
                                Wrong email address?
                            </p>
                            <TextLink href={edit()}>
                                Change email address
                            </TextLink>
                        </div>

                        <RequestButton
                            action={logout()}
                            variant="link"
                            className="mx-auto"
                        >
                            Log out
                        </RequestButton>
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
