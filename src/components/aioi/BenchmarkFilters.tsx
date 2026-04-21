// Filter pill row used on the Benchmarks page. Extracted so the page file
// stays focused on layout and aggregation rather than control chrome.

interface Option<T extends string> {
  value: T;
  label: string;
}

export function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
  helper,
}: {
  label: string;
  options: ReadonlyArray<Option<T> | T>;
  value: T;
  onChange: (v: T) => void;
  helper?: string;
}) {
  const normalised: Option<T>[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center py-4 sm:py-5 border-b border-cream/10">
      <div className="col-span-12 sm:col-span-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/40">
          {label}
        </span>
        {helper && (
          <p className="mt-1 font-display italic text-[13px] sm:text-sm text-cream/45">{helper}</p>
        )}
      </div>
      <div className="col-span-12 sm:col-span-9 flex flex-wrap gap-1.5">
        {normalised.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`px-3 py-2 sm:py-1.5 min-h-[36px] rounded-sm font-ui text-xs tracking-wide transition-colors border ${
                active
                  ? "bg-brass text-walnut border-brass"
                  : "bg-transparent text-cream/65 border-cream/15 hover:border-cream/35 hover:text-cream"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
