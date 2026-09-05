import type { ComponentProps } from 'react';
import { FieldError } from '@/components/ui/field';

export default function InputError({
    message,
    className = '',
    ...props
}: Omit<ComponentProps<typeof FieldError>, 'children'> & { message?: string }) {
    return message ? (
        <FieldError {...props} className={className}>
            {message}
        </FieldError>
    ) : null;
}
