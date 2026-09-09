import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    duration: number;
    paused?: boolean;
    onElapsed?: () => void;
    className?: string;
};

// A visual countdown, not task progress: keep frame-by-frame changes out of
// the accessibility tree. Persistent notifications don't mount this component.
export function NotificationCountdown({
    duration,
    paused = false,
    onElapsed,
    className,
}: Props) {
    const bar = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(paused);
    const onElapsedRef = useRef(onElapsed);

    useEffect(() => {
        pausedRef.current = paused;
        onElapsedRef.current = onElapsed;
    }, [paused, onElapsed]);

    useEffect(() => {
        if (duration <= 0) return;

        const element = bar.current;
        if (!element) return;

        const win = element.ownerDocument.defaultView;
        if (!win) return;

        let remaining = duration;
        let previous = win.performance.now();
        let windowFocused = true;
        let frame: number;
        const onBlur = () => {
            windowFocused = false;
        };
        const onFocus = () => {
            windowFocused = true;
            previous = win.performance.now();
        };
        const onVisibilityChange = () => {
            previous = win.performance.now();
        };
        const reducedMotion = win.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );

        const tick = (now: number) => {
            if (
                !pausedRef.current &&
                windowFocused &&
                !element.ownerDocument.hidden
            ) {
                remaining = Math.max(0, remaining - (now - previous));
            }
            previous = now;
            const fraction = remaining / duration;
            // Retain the time cue with discrete steps when motion is reduced.
            const visibleFraction = reducedMotion.matches
                ? Math.ceil(fraction * 10) / 10
                : fraction;
            element.style.transform = `scaleX(${visibleFraction})`;

            if (remaining === 0) {
                onElapsedRef.current?.();
            } else {
                frame = win.requestAnimationFrame(tick);
            }
        };

        win.addEventListener('blur', onBlur);
        win.addEventListener('focus', onFocus);
        element.ownerDocument.addEventListener(
            'visibilitychange',
            onVisibilityChange,
        );
        frame = win.requestAnimationFrame(tick);

        return () => {
            win.cancelAnimationFrame(frame);
            win.removeEventListener('blur', onBlur);
            win.removeEventListener('focus', onFocus);
            element.ownerDocument.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
        };
    }, [duration]);

    if (duration <= 0) return null;

    return (
        <div
            aria-hidden="true"
            data-slot="notification-countdown"
            className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-[inherit] bg-current/10',
                className,
            )}
        >
            <div ref={bar} className="h-full origin-left bg-current" />
        </div>
    );
}
