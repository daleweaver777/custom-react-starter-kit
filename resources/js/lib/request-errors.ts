const failures = new Set<(status: number) => void>();

export function reportRequestError(status: number) {
    if (status === 422) return;
    failures.forEach((listener) => listener(status));
}

export function onRequestError(listener: (status: number) => void) {
    failures.add(listener);
    return () => {
        failures.delete(listener);
    };
}
