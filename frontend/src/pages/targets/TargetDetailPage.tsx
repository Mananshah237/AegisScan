import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Play, Activity, ArrowLeft, Globe, Zap, ShieldAlert } from 'lucide-react';
import { Card, Button, Spinner, Badge, PageHeader } from '@/components/ui';

interface Target {
  id: string;
  name: string;
  base_url: string;
}

export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [target, setTarget] = useState<Target | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<'quick' | 'full' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get(`/targets/${id}`)
      .then((r) => setTarget(r.data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  const startScan = async (profile: 'quick' | 'full') => {
    if (!target) return;
    setStarting(profile);
    try {
      await api.post('/scans/', { target_id: target.id, profile });
      navigate('/scans');
    } catch {
      alert('Failed to start scan');
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <Spinner />;
  if (!target)
    return (
      <Card className="p-8 text-center text-muted">
        Target not found.{' '}
        <Link to="/targets" className="text-accent hover:underline">
          Back to Targets
        </Link>
      </Card>
    );

  return (
    <div>
      <Link
        to="/targets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Targets
      </Link>

      <PageHeader
        title={target.name}
        subtitle={target.base_url}
        actions={<Badge className="gap-1"><Globe className="h-3 w-3" /> Target</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex flex-col p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-lg bg-accent/15 p-2 text-accent">
              <Zap className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold">Quick Scan</h3>
          </div>
          <p className="flex-1 text-sm text-muted">
            Rapid spider and passive scan (~1–3 min). Safe for frequent, daily checks.
          </p>
          <Button
            className="mt-5 self-start"
            onClick={() => startScan('quick')}
            loading={starting === 'quick'}
            disabled={!!starting}
          >
            <Play className="h-4 w-4" /> Run Quick Scan
          </Button>
        </Card>

        <Card className="flex flex-col border-high/30 p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-lg bg-high/15 p-2 text-high">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold">Full Scan</h3>
          </div>
          <p className="flex-1 text-sm text-muted">
            Deep crawl and active attacks (~20–60 min). Intrusive — only run against systems you are
            authorized to test.
          </p>
          <Button
            variant="outline"
            className="mt-5 self-start"
            onClick={() => startScan('full')}
            loading={starting === 'full'}
            disabled={!!starting}
          >
            <Activity className="h-4 w-4" /> Run Full Scan
          </Button>
        </Card>
      </div>
    </div>
  );
}
