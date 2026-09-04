import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    let authConfigContent: {
        title: string;
        description: string;
        toggleText: string;
    };

    if (showRecoveryInput) {
        authConfigContent = {
            title: 'Recovery code',
            description:
                'Please confirm access to your account by entering one of your emergency recovery codes.',
            toggleText: 'login using an authentication code',
        };
    } else {
        authConfigContent = {
            title: 'Authentication code',
            description:
                'Enter the authentication code provided by your authenticator application.',
            toggleText: 'login using a recovery code',
        };
    }

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <div className="flex flex-col gap-6">
                <Form
                    {...store.form()}
                    className="flex flex-col gap-4"
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            <FieldGroup>
                                {showRecoveryInput ? (
                                    <Field
                                        data-invalid={!!errors.recovery_code}
                                    >
                                        <Input
                                            name="recovery_code"
                                            type="text"
                                            placeholder="Enter recovery code"
                                            autoFocus={showRecoveryInput}
                                            required
                                            aria-invalid={
                                                !!errors.recovery_code
                                            }
                                        />
                                        <InputError
                                            message={errors.recovery_code}
                                        />
                                    </Field>
                                ) : (
                                    <Field
                                        data-invalid={!!errors.code}
                                        className="items-center text-center"
                                    >
                                        <InputOTP
                                            name="code"
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                            disabled={processing}
                                            pattern={REGEXP_ONLY_DIGITS}
                                            autoFocus
                                            aria-invalid={!!errors.code}
                                        >
                                            <InputOTPGroup>
                                                {Array.from(
                                                    { length: OTP_MAX_LENGTH },
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                        <InputError message={errors.code} />
                                    </Field>
                                )}
                            </FieldGroup>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                Continue
                            </Button>

                            <div className="text-muted-foreground text-center text-sm">
                                <span>or you can</span>{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {authConfigContent.toggleText}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
