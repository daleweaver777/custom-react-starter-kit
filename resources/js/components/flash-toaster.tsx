import { Toaster } from '@/components/ui/toast';
import { useFlashToast } from '@/hooks/use-flash-toast';

export default function FlashToaster() {
    useFlashToast();

    return <Toaster />;
}
