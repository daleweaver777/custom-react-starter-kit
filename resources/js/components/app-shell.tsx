import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    return (
        <>
            <a
                href="#main-content"
                className="bg-background text-foreground sr-only rounded-md p-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:ring-2"
            >
                Skip to content
            </a>
            {variant === 'header' ? (
                <div className="flex min-h-screen w-full flex-col">
                    {children}
                </div>
            ) : (
                <SidebarProvider defaultOpen={isOpen}>
                    {children}
                </SidebarProvider>
            )}
        </>
    );
}
