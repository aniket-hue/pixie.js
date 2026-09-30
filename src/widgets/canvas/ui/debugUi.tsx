import type { ReactNode } from 'react';

export function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

export function ActionButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded border border-neutral-700 px-2 py-1 hover:border-blue-400 hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

const FIELD = 'rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-white focus:border-blue-400 focus:outline-none disabled:opacity-40';

export function NumberField({ label, value, onChange, min, max, disabled }: { label: string; value: string; onChange: (value: string) => void; min: number; max: number; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-neutral-400">
      {label}
      <input type="number" inputMode="numeric" min={min} max={max} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`w-16 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${FIELD}`} />
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-neutral-400">
      {label}
      <input type="url" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`w-full placeholder:text-neutral-600 ${FIELD}`} />
    </label>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex rounded border border-neutral-700 p-0.5">
      {options.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className="rounded px-2 py-0.5 text-neutral-400 hover:text-white aria-pressed:bg-blue-950 aria-pressed:text-white">
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded bg-neutral-900 p-2" title={`${label}: ${value}`}>
      <div className="truncate text-neutral-400">{label}</div>
      <div className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}
