import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import { ActionButton } from '@/components/action-button';
import { Badge } from '@/components/ui/badge';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onFinish: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const { confirm } = useConfirmation();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        if (
            !(await confirm({
                title: 'Remove passkey?',
                description: `The "${passkey.name}" passkey will be removed and you will no longer be able to use it to sign in.`,
                actionLabel: 'Remove',
                destructive: true,
                always: true,
            }))
        ) {
            setIsDeleting(false);
            return;
        }
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between gap-3 border-b p-4 last:border-b-0">
            <div className="flex min-w-0 items-center gap-4">
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <KeyRound className="text-muted-foreground size-5" />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <p className="min-w-0 font-medium tracking-tight wrap-anywhere">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <Badge variant="secondary">
                                {passkey.authenticator}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Added {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="text-muted-foreground/50 mx-1">
                                    /
                                </span>
                                Last used {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <ActionButton
                pending={isDeleting}
                variant="ghost"
                size="sm"
                aria-label={`Remove ${passkey.name}`}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive [--focus-ring-color:var(--destructive)]"
                onClick={() => {
                    void handleDelete();
                }}
                disabled={isDeleting}
            >
                <Trash2 data-icon="inline-start" />
                <span className="sr-only">Remove</span>
            </ActionButton>
        </div>
    );
}
