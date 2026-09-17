import { useHttp } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import { qrCode, recoveryCodes, secretKey } from '@/routes/two-factor';

export type UseTwoFactorAuthReturn = {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    hasSetupData: boolean;
    errors: string[];
    clearErrors: () => void;
    clearSetupData: () => void;
    clearTwoFactorAuthData: () => void;
    fetchQrCode: () => Promise<void>;
    fetchSetupKey: () => Promise<void>;
    fetchSetupData: () => Promise<void>;
    fetchRecoveryCodes: () => Promise<boolean>;
    clearRecoveryCodes: () => void;
};

export const OTP_MAX_LENGTH = 6;

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
    const { submit } = useHttp();
    const { confirm } = useConfirmation();

    const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
    const [manualSetupKey, setManualSetupKey] = useState<string | null>(null);
    const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const generation = useRef(0);
    const recoveryGeneration = useRef(0);
    const setupRequest = useRef<Promise<void> | null>(null);

    const hasSetupData = qrCodeSvg !== null && manualSetupKey !== null;

    const clearErrors = (): void => {
        setErrors([]);
    };

    const clearSetupData = useCallback((): void => {
        generation.current++;
        setManualSetupKey(null);
        setQrCodeSvg(null);
        setErrors([]);
    }, []);

    const clearTwoFactorAuthData = useCallback((): void => {
        generation.current++;
        recoveryGeneration.current++;
        setManualSetupKey(null);
        setQrCodeSvg(null);
        setErrors([]);
        setRecoveryCodesList([]);
    }, []);

    const clearRecoveryCodes = useCallback(() => {
        recoveryGeneration.current++;
        setRecoveryCodesList([]);
    }, []);

    const fetchQrCode = async (): Promise<void> => {
        const requestGeneration = generation.current;
        try {
            const { svg } = (await submit(qrCode())) as {
                svg: string;
                url: string;
            };

            if (requestGeneration === generation.current) setQrCodeSvg(svg);
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load the QR code. Please try again.',
            ]);
            setQrCodeSvg(null);
        }
    };

    const fetchSetupKey = async (): Promise<void> => {
        const requestGeneration = generation.current;
        try {
            const { secretKey: key } = (await submit(secretKey())) as {
                secretKey: string;
            };

            if (requestGeneration === generation.current)
                setManualSetupKey(key);
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load the setup key. Please try again.',
            ]);
            setManualSetupKey(null);
        }
    };

    const fetchRecoveryCodes = async (): Promise<boolean> => {
        // Keep the existing footprint while regenerating; the view hides stale
        // codes until the replacement request finishes. Expiry still clears them.
        recoveryGeneration.current++;
        if (!(await confirm())) {
            clearRecoveryCodes();
            return false;
        }
        const requestGeneration = recoveryGeneration.current;
        try {
            setErrors([]);
            const codes = (await submit(recoveryCodes())) as string[];
            if (requestGeneration !== recoveryGeneration.current) return false;
            setRecoveryCodesList(codes);
            return true;
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load recovery codes. Please try again.',
            ]);
            setRecoveryCodesList([]);
            return false;
        }
    };

    const fetchSetupData = async (): Promise<void> => {
        if (setupRequest.current) {
            return setupRequest.current;
        }

        setErrors([]);
        setupRequest.current = Promise.all([fetchQrCode(), fetchSetupKey()])
            .then(() => {})
            .finally(() => {
                setupRequest.current = null;
            });

        return setupRequest.current;
    };

    return {
        qrCodeSvg,
        manualSetupKey,
        recoveryCodesList,
        hasSetupData,
        errors,
        clearErrors,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchQrCode,
        fetchSetupKey,
        fetchSetupData,
        fetchRecoveryCodes,
        clearRecoveryCodes,
    };
};
