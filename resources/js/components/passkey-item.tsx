import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
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

            <AlertDialog>
                <AlertDialogTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${passkey.name}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        />
                    }
                >
                    <Trash2 data-icon="inline-start" />
                    <span className="sr-only">Remove</span>
                </AlertDialogTrigger>

                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                            <Trash2 />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Remove passkey?</AlertDialogTitle>
                        <AlertDialogDescription className="wrap-anywhere">
                            The "{passkey.name}" passkey will be removed and you
                            will no longer be able to use it to sign in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
