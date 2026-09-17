import { useContext, useState, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useActionLoading } from '@/hooks/use-action-loading';
import { ConfirmationContext } from '@/hooks/use-confirmation';
import { cn } from '@/lib/utils';

export function ActionButton({
    pending,
    pauseWhileConfirming = true,
    disabled,
    children,
    className,
    ...props
}: ComponentProps<typeof Button> & {
    pending: boolean;
    pauseWhileConfirming?: boolean;
}) {
    const confirmation = useContext(ConfirmationContext);
    const loading =
        pending && !(pauseWhileConfirming && confirmation?.prompting);
    const visible = useActionLoading(loading);
    const [idleContent, setIdleContent] = useState(children);
    // Snapshot the idle label before committing, so pending content stays stable
    // without a second commit from a layout effect.
    if (!pending && idleContent !== children) {
        setIdleContent(children);
    }
    return (
        <Button
            {...props}
            disabled={disabled || pending}
            aria-busy={loading}
            data-loading={visible || undefined}
            className={cn('action-button', className)}
        >
            <span className="action-button-content">
                {pending ? idleContent : children}
            </span>
            {visible && (
                <Spinner
                    className="action-button-spinner"
                    aria-hidden="true"
                    role={undefined}
                    aria-label={undefined}
                />
            )}
        </Button>
    );
}
