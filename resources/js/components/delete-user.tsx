import { usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import ConfirmedForm from '@/components/confirmed-form';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Auth } from '@/types';

export default function DeleteUser() {
    const { auth, mustVerifyEmail } = usePage<{
        auth: Auth;
        mustVerifyEmail: boolean;
    }>().props;
    const requiresEmailVerification =
        mustVerifyEmail && auth.user.email_verified_at === null;

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
                {requiresEmailVerification ? (
                    <p className="w-full">
                        Verify your email address before deleting your account.
                    </p>
                ) : (
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
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={processing}
                                data-test="delete-user-button"
                            >
                                Delete
                            </Button>
                        )}
                    </ConfirmedForm>
                )}
            </CardFooter>
        </Card>
    );
}
