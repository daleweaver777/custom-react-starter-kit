import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="p-4">
            <Heading
                title="Settings"
                description="Manage your profile and account settings"
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-row gap-1 border-b lg:flex-col lg:border-b-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item) => {
                            const isActive = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={toUrl(item.href)}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        buttonVariants({ variant: 'ghost' }),
                                        'relative flex-1 justify-center lg:w-full lg:flex-none lg:justify-start',
                                        isActive && [
                                            'after:bg-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5',
                                            'lg:bg-muted lg:after:hidden',
                                        ],
                                    )}
                                >
                                    {item.icon && <item.icon />}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <div className="flex-1 md:max-w-2xl">
                    <section className="flex max-w-xl flex-col gap-6">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
