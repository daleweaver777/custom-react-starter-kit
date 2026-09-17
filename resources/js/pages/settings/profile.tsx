import { ActionButton } from '@/components/action-button';
import { Head, usePage } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import { useId, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import ChangeEmail from '@/components/change-email';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
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

type PageProps = {
    auth: Auth;
    pendingEmail: string | null;
};

export default function Profile() {
    const formId = useId();

    const { auth, pendingEmail } = usePage<PageProps>().props;
    const [initialName] = useState(auth.user.name);

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
                                            defaultValue={initialName}
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
                                <ActionButton
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                    pending={processing}
                                >
                                    Save
                                </ActionButton>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>

            <ChangeEmail email={auth.user.email} pendingEmail={pendingEmail} />

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
