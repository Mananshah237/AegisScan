import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { ScanLine, ChevronRight } from 'lucide-react';
import { PageHeader, Card, Spinner, EmptyState, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Scan {
  id: string;
  target_id: string;
  status: string;
  profile: string;
  created_at: string;
  target?: { name: string; base_url: string };
}

function statusClasses(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('complet')) return 'bg-ok/15 text-ok border-ok/30';
  if (s.includes('fail')) return 'bg-crit/15 text-crit border-crit/30';
  if (s.includes('run') || s.includes('progress')) return 'bg-accent/15 text-accent border-accent/30';
  return 'bg-medium/15 text-medium border-medium/30';
}

export default function ScanListPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/scans/')
      .then((r) => setScans(r.data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Scans" subtitle="Scan history and live status." />

      {scans.length === 0 ? (
        <EmptyState
          icon={<ScanLine className="h-8 w-8" />}
          title="No scans yet"
          description="Pick a target and launch a scan to populate your history."
          action={
            <Link to="/targets">
              <Button variant="outline">Go to Targets</Button>
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-line/50">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              to={`/scans/${scan.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="truncate font-medium text-fg">
                    {scan.target?.name || 'Unknown target'}
                  </p>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                      statusClasses(scan.status),
                    )}
                  >
                    {scan.status}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted">
                  {scan.target?.base_url}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {scan.profile && <Badge>{scan.profile}</Badge>}
                <span className="font-mono text-xs text-muted">{scan.id.slice(0, 8)}</span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
