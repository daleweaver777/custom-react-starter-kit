import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <main className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 text-sm font-medium"
                        >
                            <div className="mb-1 flex size-9 items-center justify-center rounded-lg">
                                <AppLogoIcon className="text-foreground size-9 fill-current" />
                            </div>
                            <span className="sr-only">Home</span>
                        </Link>

                        <div className="flex flex-col gap-1 text-center">
                            <h1 className="font-heading text-lg font-semibold">
                                {title}
                            </h1>
                            <p className="text-muted-foreground text-sm text-balance">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </main>
    );
}
