import type { ReactNode } from 'react';

export default function AuthStatus({ children }: { children?: ReactNode }) {
    return children ? (
        <div
            role="status"
            className="text-center text-sm font-medium text-green-600 dark:text-green-400"
        >
            {children}
        </div>
    ) : null;
}
