import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    try {
        const stored = localStorage.getItem('appearance');

        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return 'system';
    }
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => {
    applyTheme(currentAppearance);
    notify();
};

const handleStorageChange = (event: StorageEvent): void => {
    if (event.key !== 'appearance' && event.key !== null) {
        return;
    }

    currentAppearance = getStoredAppearance();
    setCookie('appearance', currentAppearance);
    applyTheme(currentAppearance);
    notify();
};

const updateAppearance = (mode: Appearance): void => {
    currentAppearance = mode;

    try {
        localStorage.setItem('appearance', mode);
    } catch {
        // Theme changes still work when browser storage is unavailable.
    }

    setCookie('appearance', mode);
    applyTheme(mode);
    notify();
};

let themeMediaQuery: MediaQueryList | null = null;

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    updateAppearance(getStoredAppearance());

    // Set up system theme change listener
    themeMediaQuery?.removeEventListener('change', handleSystemThemeChange);
    themeMediaQuery = mediaQuery();
    themeMediaQuery?.addEventListener('change', handleSystemThemeChange);
    window.addEventListener('storage', handleStorageChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const resolvedAppearance: ResolvedAppearance = useSyncExternalStore(
        subscribe,
        () => (isDarkMode(currentAppearance) ? 'dark' : 'light'),
        () => 'light',
    );

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
