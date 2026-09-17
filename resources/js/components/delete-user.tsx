import { ActionButton } from '@/components/action-button';
/* @chisel-email-verification */
import { usePage } from '@inertiajs/react';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import ConfirmedForm from '@/components/confirmed-form';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
/* @chisel-email-verification */
import type { Auth } from '@/types';
/* @end-chisel-email-verification */

function DeleteUserAction() {
    /* @chisel-email-verification */
    const { auth, mustVerifyEmail } = usePage<{
        auth: Auth;
        mustVerifyEmail: boolean;
    }>().props;
    if (mustVerifyEmail && auth.user.email_verified_at === null) {
        return (
            <p className="w-full">
                Verify your email address before deleting your account.
            </p>
        );
    }
    /* @end-chisel-email-verification */
    return (
        <ConfirmedForm
            {...ProfileController.destroy.form()}
            options={{ preserveScroll: true }}
            confirmation={{
                title: 'Delete account?',
                description:
                    'Your account and all of its resources will be permanently deleted. This cannot be undone.',
                actionLabel: 'Delete account',
                destructive: true,
                always: true,
            }}
        >
            {({ processing }) => (
                <ActionButton
                    type="submit"
                    variant="destructive"
                    disabled={processing}
                    data-test="delete-user-button"
                    pending={processing}
                >
                    Delete
                </ActionButton>
            )}
        </ConfirmedForm>
    );
}

export default function DeleteUser() {
    return (
        <Card className="text-destructive ring-destructive/25">
            <CardHeader>
                <CardTitle>Delete account</CardTitle>
                <CardDescription className="text-destructive/90">
                    Delete your account and all of its resources
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Please proceed with caution, this cannot be undone.</p>
            </CardContent>

            <CardFooter className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10 justify-end">
                <DeleteUserAction />
            </CardFooter>
        </Card>
    );
}
