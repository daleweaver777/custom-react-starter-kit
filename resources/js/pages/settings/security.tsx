import { Form, Head } from '@inertiajs/react';
import { useId } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { focusFirstFormError } from '@/lib/utils';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps /* @end-chisel-2fa */;

export default function Security(props: Props) {
    const formId = useId();

    return (
        <>
            <Head title="Security settings" />

            <Card>
                <CardHeader>
                    <CardTitle>Update password</CardTitle>
                    <CardDescription>
                        Ensure your account is using a long, random password to
                        stay secure
                    </CardDescription>
                </CardHeader>

                <Form
                    id={formId}
                    onError={(errors) => focusFirstFormError(formId, errors)}
                    noValidate
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'new_password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    className="flex flex-col gap-(--card-spacing)"
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            <CardContent>
                                <FieldGroup>
                                    <Field
                                        data-invalid={!!errors.current_password}
                                    >
                                        <FieldLabel htmlFor="current_password">
                                            Current password
                                        </FieldLabel>

                                        <PasswordInput
                                            id="current_password"
                                            required
                                            name="current_password"
                                            onChange={() =>
                                                clearErrors('current_password')
                                            }
                                            autoComplete="current-password"
                                            placeholder="Current password"
                                            aria-invalid={
                                                !!errors.current_password
                                            }
                                            aria-describedby={
                                                errors.current_password
                                                    ? 'current_new_password-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="current_new_password-error"
                                            message={errors.current_password}
                                        />
                                    </Field>

                                    <Field data-invalid={!!errors.new_password}>
                                        <FieldLabel htmlFor="new_password">
                                            New password
                                        </FieldLabel>

                                        <PasswordInput
                                            id="new_password"
                                            required
                                            name="new_password"
                                            onChange={() =>
                                                clearErrors(
                                                    'new_password',
                                                    'password_confirmation',
                                                )
                                            }
                                            autoComplete="new-password"
                                            placeholder="New password"
                                            passwordrules={props.passwordRules}
                                            aria-invalid={!!errors.new_password}
                                            aria-describedby={
                                                errors.new_password
                                                    ? 'new_password-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="new_password-error"
                                            message={errors.new_password}
                                        />
                                    </Field>

                                    <Field
                                        data-invalid={
                                            !!errors.password_confirmation
                                        }
                                    >
                                        <FieldLabel htmlFor="password_confirmation">
                                            Confirm password
                                        </FieldLabel>

                                        <PasswordInput
                                            id="password_confirmation"
                                            required
                                            name="password_confirmation"
                                            onChange={() =>
                                                clearErrors(
                                                    'new_password',
                                                    'password_confirmation',
                                                )
                                            }
                                            autoComplete="new-password"
                                            placeholder="Confirm password"
                                            passwordrules={props.passwordRules}
                                            aria-invalid={
                                                !!errors.password_confirmation
                                            }
                                            aria-describedby={
                                                errors.password_confirmation
                                                    ? 'password_confirmation-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="password_confirmation-error"
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </Field>
                                </FieldGroup>
                            </CardContent>

                            <CardFooter className="justify-end">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    Save
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>

            {/* @chisel-2fa */}
            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
            {/* @end-chisel-passkeys */}
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
