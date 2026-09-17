import { ActionButton } from '@/components/action-button';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import ConfirmedForm from '@/components/confirmed-form';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<boolean>;
    clearRecoveryCodes: () => void;
    errors: string[];
};

const RECOVERY_CODES_ID = 'recovery-codes-section';

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
    clearRecoveryCodes,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const loadingRef = useRef(false);
    const codesSectionRef = useRef<HTMLUListElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    useEffect(() => {
        if (!recoveryCodesList.length) setCodesAreVisible(false);
    }, [recoveryCodesList]);

    const loadCodes = async (regenerated = false) => {
        if (loadingRef.current) return;

        loadingRef.current = true;
        if (!regenerated) setIsLoading(true);
        const loaded = await fetchRecoveryCodes().finally(() => {
            loadingRef.current = false;
            setIsLoading(false);
        });
        setCodesAreVisible(loaded);

        requestAnimationFrame(() => {
            codesSectionRef.current?.scrollIntoView({ block: 'nearest' });
        });
    };

    const toggleCodesVisibility = () => {
        if (codesAreVisible) {
            clearRecoveryCodes();
            setCodesAreVisible(false);
        } else {
            void loadCodes();
        }
    };

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

            {errors.length > 0 && (
                <CardContent>
                    <AlertError errors={errors} />
                </CardContent>
            )}

            {codesAreVisible && (
                <CardContent id={RECOVERY_CODES_ID}>
                    <div className="flex flex-col gap-3">
                        <ul
                            ref={codesSectionRef}
                            className="bg-muted grid gap-1 rounded-lg p-3 font-mono text-sm"
                            style={{
                                visibility: regenerating ? 'hidden' : undefined,
                            }}
                            aria-busy={regenerating}
                            aria-label="Recovery codes"
                        >
                            {recoveryCodesList.map((code) => (
                                <li key={code}>{code}</li>
                            ))}
                        </ul>
                        <p
                            id="regenerate-warning"
                            className="text-muted-foreground text-sm select-none"
                        >
                            Each recovery code can be used once to access your
                            account and will be removed after use. If you need
                            more, click{' '}
                            <span className="font-medium">
                                Regenerate codes
                            </span>{' '}
                            below.
                        </p>
                    </div>
                </CardContent>
            )}

            <CardFooter className="flex-wrap justify-end gap-3">
                {(canRegenerateCodes || regenerating) && (
                    <ConfirmedForm
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        confirmation={{
                            title: 'Regenerate recovery codes?',
                            description:
                                'Your current codes will stop working. Any copy you have saved elsewhere becomes unusable.',
                            actionLabel: 'Regenerate',
                            destructive: true,
                            always: true,
                        }}
                        onStart={() => setRegenerating(true)}
                        onFinish={() => setRegenerating(false)}
                        onSuccess={() => loadCodes(true)}
                    >
                        {({ processing }) => (
                            <ActionButton
                                type="submit"
                                variant="secondary"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                                pending={processing}
                            >
                                <RefreshCw data-icon="inline-start" />
                                Regenerate codes
                            </ActionButton>
                        )}
                    </ConfirmedForm>
                )}

                <ActionButton
                    pending={isLoading}
                    onClick={toggleCodesVisibility}
                    disabled={isLoading || regenerating}
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
                </ActionButton>
            </CardFooter>
        </Card>
    );
}
