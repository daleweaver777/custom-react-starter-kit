import { Toaster } from '@/components/ui/toast';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { useRequestErrors } from '@/hooks/use-request-errors';

export default function FlashToaster() {
    useFlashToast();
    useRequestErrors();

    return <Toaster />;
}
