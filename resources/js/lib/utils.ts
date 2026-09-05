import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function focusFirstFormError(
    formId: string,
    errors: Record<string, unknown>,
): void {
    // Let Inertia render errors, reset values and re-enable controls first.
    requestAnimationFrame(() => {
        const form = document.getElementById(formId);

        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        // Follow visual form order even if the server returns a different order.
        for (const field of form.elements) {
            if (!(field instanceof HTMLElement)) {
                continue;
            }

            const name = field.getAttribute('name');

            if (!name || !errors[name]) {
                continue;
            }

            field.focus();

            if (document.activeElement === field) {
                return;
            }
        }
    });
}
