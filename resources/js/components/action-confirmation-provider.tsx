import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationContext } from '@/hooks/use-confirmation';
import type { ConfirmationOptions } from '@/hooks/use-confirmation';

export default function ActionConfirmationProvider({
    children,
}: PropsWithChildren) {
    const [dialog, setDialog] = useState<ConfirmationOptions | null>(null);
    const pending = useRef<((confirmed: boolean) => void) | null>(null);
    const trigger = useRef<HTMLElement | null>(null);

    const finish = useCallback((confirmed: boolean) => {
        const resolve = pending.current;
        pending.current = null;
        setDialog(null);
        resolve?.(confirmed);
    }, []);

    useEffect(() => {
        const removeListener = router.on('navigate', () => finish(false));
        return () => {
            removeListener();
            pending.current?.(false);
            pending.current = null;
        };
    }, [finish]);

    const confirm = useCallback(
        (options: ConfirmationOptions = {}): Promise<boolean> => {
            if (pending.current) return Promise.resolve(false);
            if (!options.always) return Promise.resolve(true);

            return new Promise((resolve) => {
                pending.current = resolve;
                trigger.current =
                    document.activeElement instanceof HTMLElement
                        ? document.activeElement
                        : null;
                setDialog(options);
            });
        },
        [],
    );

    return (
        <ConfirmationContext
            value={{
                confirm,
                /* @chisel-password-confirmation */
                enabled: false,
                expiresAt: 0,
                /* @end-chisel-password-confirmation */
                prompting: dialog !== null,
            }}
        >
            {children}
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open) finish(false);
                }}
            >
                <DialogContent showCloseButton={false} finalFocus={trigger}>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.title ?? 'Confirm action'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.description ??
                                'Please confirm to continue.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            finish(true);
                        }}
                    >
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => finish(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant={
                                    dialog?.destructive
                                        ? 'destructive'
                                        : 'default'
                                }
                            >
                                {dialog?.actionLabel ?? 'Continue'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </ConfirmationContext>
    );
}
