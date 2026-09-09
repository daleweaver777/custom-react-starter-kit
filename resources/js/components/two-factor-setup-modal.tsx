import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, ScanLine } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldSeparator } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { clearFormErrors, focusFirstFormError } from '@/lib/utils';
import { confirm } from '@/routes/two-factor';

function GridScanIcon() {
    return (
        <div className="border-border bg-card mb-3 rounded-full border p-0.5 shadow-sm">
            <div className="border-border bg-muted relative overflow-hidden rounded-full border p-2.5">
                <div className="absolute inset-0 grid grid-cols-5 opacity-50">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`col-${i + 1}`}
                            className="border-border border-r last:border-r-0"
                        />
                    ))}
                </div>
                <div className="absolute inset-0 grid grid-rows-5 opacity-50">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`row-${i + 1}`}
                            className="border-border border-b last:border-b-0"
                        />
                    ))}
                </div>
                <ScanLine className="text-foreground relative z-20 size-6" />
            </div>
        </div>
    );
}

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
    onRetry,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
    onRetry: () => Promise<void>;
}) {
    const { resolvedAppearance } = useAppearance();
    const [copiedText, copy] = useClipboard();
    const [copyMessage, setCopyMessage] = useState('');
    const IconComponent = copiedText === manualSetupKey ? Check : Copy;

    return (
        <>
            {errors?.length ? (
                <>
                    <AlertError errors={errors} />
                    <Button variant="outline" onClick={onRetry}>
                        Try again
                    </Button>
                </>
            ) : (
                <>
                    <div className="mx-auto flex w-full max-w-64 min-w-0 overflow-hidden">
                        <div className="border-border mx-auto aspect-square w-full min-w-0 rounded-lg border">
                            <div className="z-10 flex h-full w-full items-center justify-center p-5">
                                {qrCodeSvg ? (
                                    <img
                                        className="aspect-square w-full rounded-lg bg-white p-2"
                                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCodeSvg)}`}
                                        alt="QR code for setting up two-factor authentication"
                                        style={{
                                            filter:
                                                resolvedAppearance === 'dark'
                                                    ? 'invert(1) brightness(1.5)'
                                                    : undefined,
                                        }}
                                    />
                                ) : (
                                    <Spinner />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full gap-5">
                        <Button
                            className="w-full"
                            onClick={onNextStep}
                            disabled={!qrCodeSvg || !manualSetupKey}
                        >
                            {buttonText}
                        </Button>
                    </div>

                    <FieldSeparator>
                        Or enter the setup key manually
                    </FieldSeparator>

                    <InputGroup>
                        <InputGroupInput
                            type="text"
                            readOnly
                            value={manualSetupKey ?? ''}
                            aria-label="Two-factor authentication setup key"
                        />
                        <InputGroupAddon align="inline-end">
                            {manualSetupKey ? (
                                <InputGroupButton
                                    size="icon-xs"
                                    onClick={async () => {
                                        const copied =
                                            await copy(manualSetupKey);
                                        setCopyMessage(
                                            copied
                                                ? 'Setup key copied.'
                                                : 'Unable to copy the setup key. Select and copy it manually.',
                                        );
                                    }}
                                    aria-label="Copy setup key"
                                >
                                    <IconComponent />
                                </InputGroupButton>
                            ) : (
                                <Spinner />
                            )}
                        </InputGroupAddon>
                    </InputGroup>
                    {copyMessage && (
                        <p role="status" className="text-sm">
                            {copyMessage}
                        </p>
                    )}
                </>
            )}
        </>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const formId = useId();

    const [code, setCode] = useState<string>('');
    const pinInputContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const focusTimer = window.setTimeout(() => {
            pinInputContainerRef.current?.querySelector('input')?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, []);

    return (
        <Form
            id={formId}
            onError={(errors) => {
                setCode('');
                focusFirstFormError(formId, errors);
            }}
            noValidate
            {...confirm.form()}
            errorBag="confirmTwoFactorAuthentication"
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
        >
            {({ processing, errors, clearErrors }) => (
                <>
                    <div
                        ref={pinInputContainerRef}
                        className="relative flex w-full flex-col gap-3"
                    >
                        <FieldGroup>
                            <Field
                                data-invalid={!!errors.code}
                                className="items-center py-2"
                            >
                                <InputOTP
                                    id="otp"
                                    name="code"
                                    aria-label="Authentication code"
                                    aria-describedby={
                                        errors.code
                                            ? 'setup-code-error'
                                            : undefined
                                    }
                                    required
                                    minLength={OTP_MAX_LENGTH}
                                    maxLength={OTP_MAX_LENGTH}
                                    value={code}
                                    onChange={(value) => {
                                        setCode(value);
                                        clearFormErrors(
                                            errors,
                                            clearErrors,
                                            'code',
                                        );
                                    }}
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
                                <InputError
                                    id="setup-code-error"
                                    message={errors.code}
                                />
                            </Field>
                        </FieldGroup>

                        <div className="flex w-full gap-5">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={onBack}
                                disabled={processing}
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={
                                    processing || code.length < OTP_MAX_LENGTH
                                }
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    let modalConfig: {
        title: string;
        description: string;
        buttonText: string;
    };

    if (twoFactorEnabled) {
        modalConfig = {
            title: 'Two-factor authentication enabled',
            description:
                'Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app.',
            buttonText: 'Close',
        };
    } else if (showVerificationStep) {
        modalConfig = {
            title: 'Verify authentication code',
            description: 'Enter the 6-digit code from your authenticator app',
            buttonText: 'Continue',
        };
    } else {
        modalConfig = {
            title: 'Enable two-factor authentication',
            description:
                'To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app',
            buttonText: 'Continue',
        };
    }

    const resetModalState = () => {
        if (twoFactorEnabled) {
            clearSetupData();
        }

        setShowVerificationStep(false);
    };

    const handleClose = () => {
        resetModalState();
        onClose();
    };

    const handleModalNextStep = () => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);

            return;
        }

        clearSetupData();
        handleClose();
    };

    const fetchSetupDataRef = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataRef.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (isOpen) {
            void fetchSetupDataRef.current();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex items-center justify-center">
                    <GridScanIcon />
                    <DialogTitle>{modalConfig.title}</DialogTitle>
                    <DialogDescription className="text-center">
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-5">
                    {showVerificationStep ? (
                        <TwoFactorVerificationStep
                            onClose={handleClose}
                            onBack={() => setShowVerificationStep(false)}
                        />
                    ) : (
                        <TwoFactorSetupStep
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            buttonText={modalConfig.buttonText}
                            onNextStep={handleModalNextStep}
                            errors={errors}
                            onRetry={fetchSetupData}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
