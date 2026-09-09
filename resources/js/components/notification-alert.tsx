import { OctagonXIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { NotificationCountdown } from '@/components/notification-countdown';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Props = {
    title: string;
    description: string;
    timeout?: number;
    onDismiss: () => void;
    action?: { label: string; onClick: () => void };
};

export function NotificationAlert({
    title,
    description,
    timeout = 0,
    onDismiss,
    action,
}: Props) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [closing, setClosing] = useState(false);

    return (
        <Alert
            variant="destructive"
            className="notification-alert pointer-events-auto shadow-lg"
            data-state={closing ? 'closed' : 'open'}
            aria-atomic="true"
            onAnimationEnd={(event) => {
                if (closing && event.target === event.currentTarget) {
                    onDismiss();
                }
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFocused(false);
                }
            }}
        >
            <OctagonXIcon aria-hidden="true" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                <p>{description}</p>
                {action && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={action.onClick}
                    >
                        {action.label}
                    </Button>
                )}
            </AlertDescription>
            <AlertAction>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Dismiss notification"
                    onClick={() => setClosing(true)}
                >
                    <XIcon aria-hidden="true" />
                </Button>
            </AlertAction>
            {timeout > 0 && (
                <NotificationCountdown
                    duration={timeout}
                    paused={hovered || focused || closing}
                    onElapsed={() => setClosing(true)}
                />
            )}
        </Alert>
    );
}
