import { useHttp } from '@inertiajs/react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
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

type TwoFactorAuthData = {
    resetKey: number;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    errors: string[];
    recoveryRequest: object | null;
};

function emptyData(resetKey: number): TwoFactorAuthData {
    return {
        resetKey,
        qrCodeSvg: null,
        manualSetupKey: null,
        recoveryCodesList: [],
        errors: [],
        recoveryRequest: null,
    };
}

export const useTwoFactorAuth = (resetKey = 0): UseTwoFactorAuthReturn => {
    const { submit } = useHttp();
    const { confirm } = useConfirmation();

    const [data, setData] = useState(() => emptyData(resetKey));
    const generation = useRef(0);
    const recoveryGeneration = useRef(0);
    const setupRequest = useRef<Promise<void> | null>(null);

    if (data.resetKey !== resetKey) setData(emptyData(resetKey));

    const { qrCodeSvg, manualSetupKey, recoveryCodesList, errors } = data;

    useLayoutEffect(() => {
        // Invalidate external requests only after the reset commits, before
        // setup effects can start replacements. Abandoned renders stay inert.
        generation.current++;
        recoveryGeneration.current++;
        setupRequest.current = null;
    }, [resetKey]);

    const hasSetupData = qrCodeSvg !== null && manualSetupKey !== null;

    const clearErrors = (): void => {
        setData((current) =>
            current.errors.length ? { ...current, errors: [] } : current,
        );
    };

    const clearSetupData = useCallback((): void => {
        generation.current++;
        setupRequest.current = null;
        setData((current) =>
            current.manualSetupKey !== null ||
            current.qrCodeSvg !== null ||
            current.errors.length
                ? {
                      ...current,
                      manualSetupKey: null,
                      qrCodeSvg: null,
                      errors: [],
                  }
                : current,
        );
    }, []);

    const clearTwoFactorAuthData = useCallback((): void => {
        generation.current++;
        recoveryGeneration.current++;
        setupRequest.current = null;
        setData((current) =>
            current.manualSetupKey !== null ||
            current.qrCodeSvg !== null ||
            current.errors.length ||
            current.recoveryCodesList.length ||
            current.recoveryRequest !== null
                ? emptyData(current.resetKey)
                : current,
        );
    }, []);

    const clearRecoveryCodes = useCallback(() => {
        recoveryGeneration.current++;
        setData((current) =>
            current.recoveryCodesList.length || current.recoveryRequest !== null
                ? { ...current, recoveryCodesList: [], recoveryRequest: null }
                : current,
        );
    }, []);

    const fetchQrCode = async (): Promise<void> => {
        const requestGeneration = generation.current;
        try {
            const { svg } = (await submit(qrCode())) as {
                svg: string;
                url: string;
            };

            if (requestGeneration === generation.current) {
                setData((current) =>
                    current.resetKey === resetKey
                        ? { ...current, qrCodeSvg: svg }
                        : current,
                );
            }
        } catch {
            if (requestGeneration !== generation.current) return;
            setData((current) =>
                current.resetKey === resetKey
                    ? {
                          ...current,
                          errors: [
                              ...current.errors,
                              'Unable to load the QR code. Please try again.',
                          ],
                          qrCodeSvg: null,
                      }
                    : current,
            );
        }
    };

    const fetchSetupKey = async (): Promise<void> => {
        const requestGeneration = generation.current;
        try {
            const { secretKey: key } = (await submit(secretKey())) as {
                secretKey: string;
            };

            if (requestGeneration === generation.current) {
                setData((current) =>
                    current.resetKey === resetKey
                        ? { ...current, manualSetupKey: key }
                        : current,
                );
            }
        } catch {
            if (requestGeneration !== generation.current) return;
            setData((current) =>
                current.resetKey === resetKey
                    ? {
                          ...current,
                          errors: [
                              ...current.errors,
                              'Unable to load the setup key. Please try again.',
                          ],
                          manualSetupKey: null,
                      }
                    : current,
            );
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
        const request = {};
        try {
            setData((current) => ({
                ...current,
                errors: [],
                recoveryRequest: request,
            }));
            const codes = (await submit(recoveryCodes())) as string[];
            if (requestGeneration !== recoveryGeneration.current) return false;
            setData((current) =>
                current.recoveryRequest === request
                    ? { ...current, recoveryCodesList: codes }
                    : current,
            );
            return true;
        } catch {
            if (requestGeneration !== recoveryGeneration.current) return false;
            setData((current) =>
                current.recoveryRequest === request
                    ? {
                          ...current,
                          errors: [
                              ...current.errors,
                              'Unable to load recovery codes. Please try again.',
                          ],
                          recoveryCodesList: [],
                      }
                    : current,
            );
            return false;
        }
    };

    const fetchSetupData = async (): Promise<void> => {
        if (setupRequest.current) {
            return setupRequest.current;
        }

        clearErrors();
        const request = Promise.all([fetchQrCode(), fetchSetupKey()])
            .then(() => {})
            .finally(() => {
                if (setupRequest.current === request)
                    setupRequest.current = null;
            });
        setupRequest.current = request;

        return request;
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
