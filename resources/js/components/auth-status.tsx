import type { ReactNode } from 'react';

export default function AuthStatus({ children }: { children?: ReactNode }) {
    return children ? (
        <div
            role="status"
            className="text-foreground text-center text-sm font-medium"
        >
            {children}
        </div>
    ) : null;
}
