import { NotificationAlert } from '@/components/notification-alert';
import { Toaster } from '@/components/ui/toast';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { useRequestErrors } from '@/hooks/use-request-errors';

export default function FlashToaster() {
    useFlashToast();
    const { error, dismiss } = useRequestErrors();

    return (
        <>
            {error && (
                <div className="pointer-events-none fixed inset-x-4 top-[max(1.5rem,env(safe-area-inset-top))] z-50 mx-auto max-w-lg">
                    <NotificationAlert
                        key={error.id}
                        {...error}
                        onDismiss={dismiss}
                    />
                </div>
            )}
            <Toaster />
        </>
    );
}
