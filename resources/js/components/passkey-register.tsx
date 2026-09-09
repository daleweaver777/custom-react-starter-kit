import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const [name, setName] = useState(() => {
        const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' on ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            requestAnimationFrame(() => addButtonRef.current?.focus());
            onSuccess();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name.trim());
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
        requestAnimationFrame(() => addButtonRef.current?.focus());
    };

    if (!isSupported) {
        return (
            <Alert className="w-full">
                <Info />
                <AlertDescription>
                    Passkeys are not supported in this browser.
                </AlertDescription>
            </Alert>
        );
    }

    if (!showForm) {
        return (
            <Button
                ref={addButtonRef}
                variant="outline"
                onClick={() => setShowForm(true)}
            >
                Add passkey
            </Button>
        );
    }

    return (
        <form
            noValidate
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-4"
        >
            <FieldGroup>
                <Field data-invalid={!!error}>
                    <FieldLabel htmlFor="passkey-name">Passkey name</FieldLabel>
                    <Input
                        id="passkey-name"
                        type="text"
                        required
                        maxLength={255}
                        aria-describedby={
                            error
                                ? 'passkey-name-description passkey-name-error'
                                : 'passkey-name-description'
                        }
                        value={name}
                        disabled={isLoading}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., MacBook Pro, iPhone"
                        className="bg-background"
                        autoFocus
                        aria-invalid={!!error}
                    />
                    <FieldDescription id="passkey-name-description">
                        A name helps you identify this passkey later.
                    </FieldDescription>
                    <InputError
                        id="passkey-name-error"
                        message={error ?? undefined}
                    />
                </Field>
            </FieldGroup>

            <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || !name.trim()}>
                    Register passkey
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
