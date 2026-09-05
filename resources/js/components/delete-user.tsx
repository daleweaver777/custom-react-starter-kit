import { Form } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

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
                <AlertDialog>
                    <AlertDialogTrigger
                        render={
                            <Button
                                variant="destructive"
                                data-test="delete-user-button"
                            />
                        }
                    >
                        Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnError={['password']}
                            resetOnSuccess
                            className="grid gap-4"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <AlertDialogHeader>
                                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                            <Trash2 />
                                        </AlertDialogMedia>
                                        <AlertDialogTitle>
                                            Delete account?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Once your account is deleted, all of
                                            its resources and data will also be
                                            permanently deleted. Please enter
                                            your password to confirm you would
                                            like to permanently delete your
                                            account.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>

                                    <FieldGroup>
                                        <Field data-invalid={!!errors.password}>
                                            <FieldLabel
                                                htmlFor="delete-password"
                                                className="sr-only"
                                            >
                                                Password
                                            </FieldLabel>

                                            <PasswordInput
                                                id="delete-password"
                                                name="password"
                                                required
                                                ref={passwordInput}
                                                placeholder="Password"
                                                autoComplete="current-password"
                                                aria-invalid={!!errors.password}
                                                aria-describedby={
                                                    errors.password
                                                        ? 'delete-password-error'
                                                        : undefined
                                                }
                                            />

                                            <InputError
                                                id="delete-password-error"
                                                message={errors.password}
                                            />
                                        </Field>
                                    </FieldGroup>

                                    <AlertDialogFooter>
                                        <AlertDialogCancel
                                            onClick={() =>
                                                resetAndClearErrors()
                                            }
                                        >
                                            Cancel
                                        </AlertDialogCancel>

                                        <AlertDialogAction
                                            variant="destructive"
                                            disabled={processing}
                                            type="submit"
                                            data-test="confirm-delete-user-button"
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </>
                            )}
                        </Form>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
