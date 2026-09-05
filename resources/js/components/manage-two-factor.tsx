import { Form } from '@inertiajs/react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
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
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

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
                        <AlertDialog>
                            <AlertDialogTrigger
                                render={<Button variant="destructive" />}
                            >
                                Disable 2FA
                            </AlertDialogTrigger>

                            <AlertDialogContent size="sm">
                                <Form
                                    noValidate
                                    {...disable.form()}
                                    className="grid gap-4"
                                >
                                    {({ processing }) => (
                                        <>
                                            <AlertDialogHeader>
                                                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                                    <ShieldOff />
                                                </AlertDialogMedia>
                                                <AlertDialogTitle>
                                                    Disable 2FA?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Your account will no longer
                                                    be protected by a second
                                                    factor. Re-enabling starts
                                                    setup from scratch with a
                                                    new secret and new recovery
                                                    codes.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>

                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    type="submit"
                                                    variant="destructive"
                                                    disabled={processing}
                                                >
                                                    Disable
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </>
                                    )}
                                </Form>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : hasSetupData ? (
                        <Button onClick={() => setShowSetupModal(true)}>
                            <ShieldCheck data-icon="inline-start" />
                            Continue setup
                        </Button>
                    ) : (
                        <Form
                            noValidate
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <Button type="submit" disabled={processing}>
                                    Enable 2FA
                                </Button>
                            )}
                        </Form>
                    )}
                </CardFooter>
            </Card>

            {twoFactorEnabled && (
                <TwoFactorRecoveryCodes
                    recoveryCodesList={recoveryCodesList}
                    fetchRecoveryCodes={fetchRecoveryCodes}
                    errors={errors}
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
