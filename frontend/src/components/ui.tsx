import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

/** Frosted-glass surface used for panels across the app. */
export function Card({
  className,
  children,
  glow = false,
  ring = false,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        'glass relative rounded-2xl shadow-xl shadow-black/30',
        ring && 'ring-grad',
        glow && 'shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_18px_50px_-12px_rgba(56,189,248,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-gradient">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'text-[#04141f] font-semibold bg-gradient-to-b from-sky-300 to-sky-500 hover:from-sky-200 hover:to-sky-400 shadow-lg shadow-sky-500/25 hover:shadow-sky-400/40',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  outline: 'border border-line text-fg hover:bg-surface-2 hover:border-accent/40',
  danger: 'bg-crit/90 text-white hover:bg-crit shadow-lg shadow-crit/20',
};

export function Button({
  variant = 'primary',
  className,
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        buttonStyles[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

const severityMap: Record<string, { label: string; cls: string; dot: string }> = {
  critical: { label: 'Critical', cls: 'bg-crit/15 text-crit ring-crit/30', dot: 'bg-crit' },
  high: { label: 'High', cls: 'bg-high/15 text-high ring-high/30', dot: 'bg-high' },
  medium: { label: 'Medium', cls: 'bg-medium/15 text-medium ring-medium/30', dot: 'bg-medium' },
  low: { label: 'Low', cls: 'bg-low/15 text-low ring-low/30', dot: 'bg-low' },
  informational: { label: 'Info', cls: 'bg-info/15 text-info ring-info/30', dot: 'bg-info' },
  info: { label: 'Info', cls: 'bg-info/15 text-info ring-info/30', dot: 'bg-info' },
};

export function severityMeta(severity: string) {
  return severityMap[(severity || 'info').toLowerCase()] ?? severityMap.info;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severityMeta(severity);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
        s.cls,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2/70 px-2 py-0.5 text-xs font-medium text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <Card className="group overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-faint">{label}</p>
          <p className={cn('mt-2 text-4xl font-extrabold tracking-tight text-fg', accent)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className="rounded-xl bg-gradient-to-br from-sky-400/20 to-indigo-400/10 p-2.5 text-accent ring-1 ring-inset ring-accent/20 transition-transform duration-200 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export const inputClass =
  'block w-full rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition-all focus:border-accent/60 focus:ring-4 focus:ring-accent/15 focus:bg-surface-2';

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(inputClass, props.className)} />
);

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg/90">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-crit">{error}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-20 text-accent', className)}>
      <Loader2 className="h-7 w-7 animate-spin" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 rounded-2xl bg-surface-2/60 p-4 text-accent ring-1 ring-inset ring-line">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
