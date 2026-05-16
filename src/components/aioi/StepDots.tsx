/**
 * StepDots — animated progress indicator for the scan.
 */
export function StepDots({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const active = i + 1 === step;
        const done = i + 1 < step;
        return (
          <div key={i} className="relative flex items-center">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                active
                  ? "w-8 bg-brass"
                  : done
                  ? "w-2 bg-brass/60"
                  : "w-2 bg-cream/15"
              }`}
            />
            {i < total - 1 && (
              <div
                className={`w-4 h-px mx-1 transition-colors duration-500 ${
                  done ? "bg-brass/40" : "bg-cream/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
