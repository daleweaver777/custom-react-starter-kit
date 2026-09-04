export type CleanupFn = () => void;

const cleanupMobileNavigation: CleanupFn = () => {
    // Remove pointer-events style from body...
    document.body.style.removeProperty('pointer-events');
};

export function useMobileNavigation(): CleanupFn {
    return cleanupMobileNavigation;
}
