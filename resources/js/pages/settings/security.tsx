import { ActionButton } from '@/components/action-button';
import { Head } from '@inertiajs/react';
import { Form } from '@/components/inertia-form';
import { useId } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';
import { edit } from '@/routes/security';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

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
                        'password',
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
                                                clearFormErrors(
                                                    errors,
                                                    clearErrors,
                                                    'current_password',
                                                )
                                            }
                                            autoComplete="current-password"
                                            placeholder="Current password"
                                            aria-invalid={
                                                !!errors.current_password
                                            }
                                            aria-describedby={
                                                errors.current_password
                                                    ? 'current_password-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="current_password-error"
                                            message={errors.current_password}
                                        />
                                    </Field>

                                    <Field data-invalid={!!errors.password}>
                                        <FieldLabel htmlFor="password">
                                            New password
                                        </FieldLabel>

                                        <PasswordInput
                                            id="password"
                                            required
                                            name="password"
                                            onChange={() =>
                                                clearFormErrors(
                                                    errors,
                                                    clearErrors,
                                                    'password',
                                                    'password_confirmation',
                                                )
                                            }
                                            autoComplete="new-password"
                                            placeholder="New password"
                                            passwordrules={props.passwordRules}
                                            aria-invalid={!!errors.password}
                                            aria-describedby={
                                                errors.password
                                                    ? 'password-error'
                                                    : undefined
                                            }
                                        />

                                        <InputError
                                            id="password-error"
                                            message={errors.password}
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
                                                clearFormErrors(
                                                    errors,
                                                    clearErrors,
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
                                <ActionButton
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                    pending={processing}
                                >
                                    Save
                                </ActionButton>
                            </CardFooter>
                        </>
                    )}
                </Form>
            </Card>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
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
