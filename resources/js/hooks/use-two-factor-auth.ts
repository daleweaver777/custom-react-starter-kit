import { useHttp } from '@inertiajs/react';
import { useRef, useState } from 'react';
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
    fetchRecoveryCodes: () => Promise<void>;
};

export const OTP_MAX_LENGTH = 6;

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
    const { submit } = useHttp();

    const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
    const [manualSetupKey, setManualSetupKey] = useState<string | null>(null);
    const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const setupRequest = useRef<Promise<void> | null>(null);

    const hasSetupData = qrCodeSvg !== null && manualSetupKey !== null;

    const clearErrors = (): void => {
        setErrors([]);
    };

    const clearSetupData = (): void => {
        setManualSetupKey(null);
        setQrCodeSvg(null);
        setErrors([]);
    };

    const clearTwoFactorAuthData = (): void => {
        setManualSetupKey(null);
        setQrCodeSvg(null);
        setErrors([]);
        setRecoveryCodesList([]);
    };

    const fetchQrCode = async (): Promise<void> => {
        try {
            const { svg } = (await submit(qrCode())) as {
                svg: string;
                url: string;
            };

            setQrCodeSvg(svg);
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load the QR code. Please try again.',
            ]);
            setQrCodeSvg(null);
        }
    };

    const fetchSetupKey = async (): Promise<void> => {
        try {
            const { secretKey: key } = (await submit(secretKey())) as {
                secretKey: string;
            };

            setManualSetupKey(key);
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load the setup key. Please try again.',
            ]);
            setManualSetupKey(null);
        }
    };

    const fetchRecoveryCodes = async (): Promise<void> => {
        try {
            setErrors([]);
            const codes = (await submit(recoveryCodes())) as string[];
            setRecoveryCodesList(codes);
        } catch {
            setErrors((prev) => [
                ...prev,
                'Unable to load recovery codes. Please try again.',
            ]);
            setRecoveryCodesList([]);
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
    };
};
