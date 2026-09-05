import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useId, useState } from 'react';
import { textLinkClasses } from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { cn, focusFirstFormError } from '@/lib/utils';
import { store } from '@/routes/two-factor/login';

const AUTH_CONFIG = {
    code: {
        title: 'Authentication code',
        description:
            'Enter the authentication code provided by your authenticator application.',
        toggleText: 'login using a recovery code',
    },
    recovery: {
        title: 'Recovery code',
        description:
            'Please confirm access to your account by entering one of your emergency recovery codes.',
        toggleText: 'login using an authentication code',
    },
} as const;

export default function TwoFactorChallenge() {
    const formId = useId();

    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent =
        AUTH_CONFIG[showRecoveryInput ? 'recovery' : 'code'];

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
                    id={formId}
                    noValidate
                    {...store.form()}
                    className="flex flex-col gap-4"
                    onError={(errors) => {
                        setCode('');
                        focusFirstFormError(formId, errors);
                    }}
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                <Field data-invalid={!!errors.recovery_code}>
                                    <FieldLabel
                                        htmlFor="recovery_code"
                                        className="sr-only"
                                    >
                                        Recovery code
                                    </FieldLabel>
                                    <Input
                                        id="recovery_code"
                                        name="recovery_code"
                                        onChange={() =>
                                            clearErrors('recovery_code')
                                        }
                                        type="text"
                                        placeholder="Enter recovery code"
                                        autoFocus={showRecoveryInput}
                                        required
                                        aria-invalid={!!errors.recovery_code}
                                        aria-describedby={
                                            errors.recovery_code
                                                ? 'recovery-code-error'
                                                : undefined
                                        }
                                    />
                                    <FieldError id="recovery-code-error">
                                        {errors.recovery_code}
                                    </FieldError>
                                </Field>
                            ) : (
                                <Field
                                    data-invalid={!!errors.code}
                                    className="text-center"
                                >
                                    <InputOTP
                                        name="code"
                                        aria-label="Authentication code"
                                        aria-invalid={!!errors.code}
                                        aria-describedby={
                                            errors.code
                                                ? 'code-error'
                                                : undefined
                                        }
                                        required
                                        minLength={OTP_MAX_LENGTH}
                                        maxLength={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={(value) => {
                                            setCode(value);
                                            clearErrors('code');
                                        }}
                                        disabled={processing}
                                        pattern={REGEXP_ONLY_DIGITS}
                                        autoFocus
                                        containerClassName="justify-center"
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
                                    <FieldError id="code-error">
                                        {errors.code}
                                    </FieldError>
                                </Field>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                Log in
                            </Button>

                            <div className="text-muted-foreground text-center text-sm">
                                <span>or you can </span>
                                <button
                                    type="button"
                                    className={cn(
                                        'cursor-pointer',
                                        textLinkClasses,
                                    )}
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {authConfigContent.toggleText}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

TwoFactorChallenge.layout = {
    title: AUTH_CONFIG.code.title,
    description: AUTH_CONFIG.code.description,
};
