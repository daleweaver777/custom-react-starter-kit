import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export const textLinkClasses =
    'text-foreground underline decoration-border underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current!';

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link className={cn(textLinkClasses, className)} {...props}>
            {children}
        </Link>
    );
}
