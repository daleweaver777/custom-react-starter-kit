import { ActionButton } from '@/components/action-button';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import ConfirmedForm from '@/components/confirmed-form';
import { useConfirmation } from '@/hooks/use-confirmation';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const {
        confirm,
        enabled: confirmationEnabled,
        expiresAt,
    } = useConfirmation();
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        clearRecoveryCodes,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const [continuing, setContinuing] = useState(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    useEffect(() => {
        if (!confirmationEnabled) return;
        if (!expiresAt) {
            setShowSetupModal(false);
            clearTwoFactorAuthData();
            return;
        }
        const timer = window.setTimeout(
            () => {
                setShowSetupModal(false);
                clearTwoFactorAuthData();
            },
            Math.max(0, expiresAt - Date.now()),
        );
        return () => window.clearTimeout(timer);
    }, [confirmationEnabled, expiresAt, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Two-factor authentication</CardTitle>
                    <CardDescription>
                        Manage your two-factor authentication settings
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        {twoFactorEnabled
                            ? 'You will be prompted for a secure, random pin during login, which you can retrieve from the TOTP-supported application on your phone.'
                            : 'When you enable two-factor authentication, you will be prompted for a secure pin during login. This pin can be retrieved from a TOTP-supported application on your phone.'}
                    </p>
                </CardContent>

                <CardFooter className="justify-end">
                    {twoFactorEnabled ? (
                        <ConfirmedForm
                            {...disable.form()}
                            confirmation={{
                                title: 'Disable 2FA?',
                                description:
                                    'Your account will no longer be protected by a second factor. Re-enabling starts setup from scratch with a new secret and new recovery codes.',
                                actionLabel: 'Disable',
                                destructive: true,
                                always: true,
                            }}
                        >
                            {({ processing }) => (
                                <ActionButton
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                    pending={processing}
                                >
                                    Disable 2FA
                                </ActionButton>
                            )}
                        </ConfirmedForm>
                    ) : hasSetupData ? (
                        <ActionButton
                            pending={continuing}
                            onClick={() => {
                                setContinuing(true);
                                void confirm()
                                    .then((confirmed) => {
                                        if (confirmed) setShowSetupModal(true);
                                    })
                                    .finally(() => setContinuing(false));
                            }}
                        >
                            <ShieldCheck data-icon="inline-start" />
                            Continue setup
                        </ActionButton>
                    ) : (
                        <ConfirmedForm
                            noValidate
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <ActionButton
                                    type="submit"
                                    disabled={processing}
                                    pending={processing}
                                >
                                    Enable 2FA
                                </ActionButton>
                            )}
                        </ConfirmedForm>
                    )}
                </CardFooter>
            </Card>

            {twoFactorEnabled && (
                <TwoFactorRecoveryCodes
                    recoveryCodesList={recoveryCodesList}
                    fetchRecoveryCodes={fetchRecoveryCodes}
                    errors={errors}
                    clearRecoveryCodes={clearRecoveryCodes}
                />
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </div>
    );
}
