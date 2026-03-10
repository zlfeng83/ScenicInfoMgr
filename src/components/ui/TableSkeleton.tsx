

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="w-full animate-pulse">
            {/* Header row */}
            <div className="flex gap-4 p-4 border-b border-white/10">
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`header-${i}`}
                        className="h-4 rounded-md bg-white/10 flex-1"
                        style={{ maxWidth: i === 0 ? '80px' : undefined }}
                    />
                ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="flex gap-4 p-4 border-b border-white/5"
                    style={{ opacity: 1 - rowIndex * 0.15 }}
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-3.5 rounded bg-white/[0.06] flex-1"
                            style={{
                                maxWidth: colIndex === 0 ? '80px' : undefined,
                                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
