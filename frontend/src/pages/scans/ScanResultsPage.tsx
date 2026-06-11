import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { ArrowLeft, Download, ShieldCheck, ChevronDown } from 'lucide-react';
import { PageHeader, Card, Button, Spinner, SeverityBadge, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Finding {
  id: string;
  title: string;
  severity: string;
  confidence: string;
  endpoint_url: string;
  description: string;
  risk_score: number;
}

const API_ROOT = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

const order = ['critical', 'high', 'medium', 'low', 'informational', 'info'];

function riskColor(score: number) {
  if (score >= 7) return 'bg-crit';
  if (score >= 4) return 'bg-high';
  if (score >= 1) return 'bg-medium';
  return 'bg-info';
}

export default function ScanResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/findings/', { params: { scan_id: id } })
      .then((r) => setFindings(r.data))
      .catch((e) => console.error('Failed to fetch findings', e))
      .finally(() => setLoading(false));
  }, [id]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of findings) {
      const k = (f.severity || 'info').toLowerCase();
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [findings]);

  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) =>
          order.indexOf((a.severity || 'info').toLowerCase()) -
          order.indexOf((b.severity || 'info').toLowerCase()),
      ),
    [findings],
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <Link
        to="/scans"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Scans
      </Link>

      <PageHeader
        title="Scan Results"
        subtitle={`Findings for scan ${id?.slice(0, 8)}`}
        actions={
          <a
            href={`${API_ROOT}/api/v1/scans/${id}/report`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <Download className="h-4 w-4" /> Download Report
            </Button>
          </a>
        }
      />

      {/* Severity summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { k: 'critical', label: 'Critical', cls: 'text-crit' },
          { k: 'high', label: 'High', cls: 'text-high' },
          { k: 'medium', label: 'Medium', cls: 'text-medium' },
          { k: 'low', label: 'Low', cls: 'text-low' },
          { k: 'info', label: 'Info', cls: 'text-info' },
        ].map((row) => {
          const count =
            row.k === 'info' ? (counts.info || 0) + (counts.informational || 0) : counts[row.k] || 0;
          return (
            <Card key={row.k} className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{row.label}</p>
              <p className={cn('mt-1 text-2xl font-semibold', count > 0 ? row.cls : 'text-muted')}>
                {count}
              </p>
            </Card>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="mb-3 h-10 w-10 text-ok" />
          <h3 className="text-base font-semibold text-fg">No findings</h3>
          <p className="mt-1 text-sm text-muted">
            This scan reported no issues (or has not completed).
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-line/50">
          {sorted.map((f) => {
            const isOpen = open === f.id;
            return (
              <div key={f.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2/40"
                >
                  <SeverityBadge severity={f.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{f.title}</p>
                    <p className="truncate font-mono text-xs text-muted">{f.endpoint_url}</p>
                  </div>
                  <div className="hidden w-40 shrink-0 sm:block">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn('h-full rounded-full', riskColor(f.risk_score))}
                          style={{ width: `${Math.min(100, (f.risk_score / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-muted">
                        {f.risk_score?.toFixed?.(1) ?? f.risk_score}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-line/40 bg-surface-2/30 px-5 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge>Confidence: {f.confidence || 'n/a'}</Badge>
                      <Badge>Risk: {f.risk_score}</Badge>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted">
                      {f.description || 'No description provided.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
