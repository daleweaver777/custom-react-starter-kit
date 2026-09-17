import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    return (
        <Empty className="rounded-lg border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <KeyRound />
                </EmptyMedia>
                <EmptyTitle>No passkeys yet</EmptyTitle>
                <EmptyDescription>
                    Add a passkey to sign in without a password
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onFinish: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onFinish,
        });
    };

    const handleRegisterSuccess = () => {
        return new Promise<void>((resolve) =>
            router.reload({ onFinish: () => resolve() }),
        );
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passkeys</CardTitle>
                <CardDescription>
                    Manage your passkeys for passwordless sign-in
                </CardDescription>
            </CardHeader>

            <CardContent>
                {passkeys.length > 0 ? (
                    <div className="border-border overflow-hidden rounded-lg border">
                        {passkeys.map((passkey) => (
                            <PasskeyItem
                                key={passkey.id}
                                passkey={passkey}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState />
                )}
            </CardContent>

            <CardFooter className="flex-col items-end gap-4">
                <PasskeyRegistration onSuccess={handleRegisterSuccess} />
            </CardFooter>
        </Card>
    );
}
