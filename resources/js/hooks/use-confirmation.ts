import { createContext, useContext } from 'react';

export type ConfirmationOptions = {
    title?: string;
    description?: string;
    actionLabel?: string;
    destructive?: boolean;
    always?: boolean;
};

export const ConfirmationContext = createContext<{
    confirm: (options?: ConfirmationOptions) => Promise<boolean>;
    /* @chisel-password-confirmation */
    enabled: boolean;
    expiresAt: number;
    /* @end-chisel-password-confirmation */
    prompting: boolean;
} | null>(null);

export function useConfirmation() {
    const context = useContext(ConfirmationContext);
    if (!context) throw new Error('ConfirmationProvider is required.');
    return context;
}
