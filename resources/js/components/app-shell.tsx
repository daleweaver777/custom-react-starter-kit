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
