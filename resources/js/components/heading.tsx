export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header
            className={variant === 'small' ? '' : 'mb-8 flex flex-col gap-1'}
        >
            {variant === 'small' ? (
                <h2 className="mb-0.5 text-base font-medium">{title}</h2>
            ) : (
                <h1 className="font-heading text-lg font-semibold">{title}</h1>
            )}
            {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
            )}
        </header>
    );
}
