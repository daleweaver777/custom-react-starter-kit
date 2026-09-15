import { Form, Head, Link } from '@inertiajs/react';
import EmailChangeController from '@/actions/App/Http/Controllers/Settings/EmailChangeController';
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
import { edit } from '@/routes/profile';

export default function ConfirmEmailChange({
    email,
    token,
}: {
    email: string;
    token: string;
}) {
    return (
        <>
            <Head title="Confirm email change" />
            <Card>
                <CardHeader>
                    <CardTitle>Confirm email change</CardTitle>
                    <CardDescription>
                        Use {email} for sign-in and password recovery? We will
                        notify your previous address after you confirm.
                    </CardDescription>
                </CardHeader>
                <Form
                    {...EmailChangeController.update.form(token)}
                    className="flex flex-col gap-(--card-spacing)"
                >
                    {({ processing, errors }) => (
                        <>
                            {errors.email && (
                                <CardContent>
                                    <InputError message={errors.email} />
                                </CardContent>
                            )}
                            <CardFooter className="justify-end gap-2">
                                <Button
                                    variant="outline"
                                    render={<Link href={edit()} />}
                                >
                                    Back to profile
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Confirm email change
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>
        </>
    );
}

ConfirmEmailChange.layout = {
    breadcrumbs: [{ title: 'Profile settings', href: edit() }],
};
