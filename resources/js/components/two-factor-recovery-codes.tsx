import { Form } from '@inertiajs/react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
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
import { Skeleton } from '@/components/ui/skeleton';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

const RECOVERY_CODES_ID = 'recovery-codes-section';

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const [isRegenerateOpen, setIsRegenerateOpen] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLUListElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible((areVisible) => !areVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <Card>
            <CardHeader>
                <CardTitle>2FA recovery codes</CardTitle>
                <CardDescription>
                    Recovery codes let you regain access if you lose your 2FA
                    device. Store them in a secure password manager.
                </CardDescription>
            </CardHeader>

            {codesAreVisible && (
                <CardContent id={RECOVERY_CODES_ID}>
                    <div className="flex flex-col gap-3">
                        {errors?.length ? (
                            <AlertError errors={errors} />
                        ) : (
                            <>
                                <ul
                                    ref={codesSectionRef}
                                    className="bg-muted grid gap-1 rounded-lg p-3 font-mono text-sm"
                                    aria-label="Recovery codes"
                                >
                                    {recoveryCodesList.length ? (
                                        recoveryCodesList.map((code) => (
                                            <li key={code}>{code}</li>
                                        ))
                                    ) : (
                                        <li
                                            className="flex flex-col gap-2"
                                            aria-label="Loading recovery codes"
                                        >
                                            {Array.from(
                                                { length: 8 },
                                                (_, index) => (
                                                    <Skeleton
                                                        key={index}
                                                        className="bg-muted-foreground/20 h-4"
                                                        aria-hidden="true"
                                                    />
                                                ),
                                            )}
                                        </li>
                                    )}
                                </ul>

                                <p
                                    id="regenerate-warning"
                                    className="text-muted-foreground text-sm select-none"
                                >
                                    Each recovery code can be used once to
                                    access your account and will be removed
                                    after use. If you need more, click{' '}
                                    <span className="font-medium">
                                        Regenerate codes
                                    </span>{' '}
                                    below.
                                </p>
                            </>
                        )}
                    </div>
                </CardContent>
            )}

            <CardFooter className="justify-end gap-3">
                {canRegenerateCodes && (
                    <AlertDialog
                        open={isRegenerateOpen}
                        onOpenChange={setIsRegenerateOpen}
                    >
                        <AlertDialogTrigger
                            render={
                                <Button
                                    variant="secondary"
                                    aria-describedby="regenerate-warning"
                                />
                            }
                        >
                            <RefreshCw data-icon="inline-start" />
                            Regenerate codes
                        </AlertDialogTrigger>

                        <AlertDialogContent size="sm">
                            <Form
                                noValidate
                                {...regenerateRecoveryCodes.form()}
                                options={{ preserveScroll: true }}
                                onSuccess={() => {
                                    setIsRegenerateOpen(false);
                                    void fetchRecoveryCodes();
                                }}
                                className="grid gap-4"
                            >
                                {({ processing }) => (
                                    <>
                                        <AlertDialogHeader>
                                            <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                                <RefreshCw />
                                            </AlertDialogMedia>
                                            <AlertDialogTitle>
                                                Regenerate recovery codes?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Your current codes will stop
                                                working. Any copy you have saved
                                                elsewhere becomes unusable.
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
                                                Regenerate
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </>
                                )}
                            </Form>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                <Button
                    onClick={toggleCodesVisibility}
                    aria-expanded={codesAreVisible}
                    aria-controls={
                        codesAreVisible ? RECOVERY_CODES_ID : undefined
                    }
                >
                    <RecoveryCodeIconComponent
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    {codesAreVisible ? 'Hide' : 'View'} recovery codes
                </Button>
            </CardFooter>
        </Card>
    );
}
