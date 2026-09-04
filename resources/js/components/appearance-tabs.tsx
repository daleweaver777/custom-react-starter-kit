import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ComponentProps } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';

export default function AppearanceToggleTab({
    ...props
}: Omit<
    ComponentProps<typeof ToggleGroup>,
    'value' | 'onValueChange' | 'multiple'
>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <ToggleGroup
            value={[appearance]}
            onValueChange={(values) => {
                const value = values[0] as Appearance | undefined;

                if (value) {
                    updateAppearance(value);
                }
            }}
            variant="outline"
            spacing={0}
            aria-label="Appearance"
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <ToggleGroupItem key={value} value={value}>
                    <Icon data-icon="inline-start" />
                    {label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
