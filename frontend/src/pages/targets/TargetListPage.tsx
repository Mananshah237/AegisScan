import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Plus, Trash2, Globe, Crosshair } from 'lucide-react';
import { PageHeader, Card, Button, Spinner, EmptyState } from '@/components/ui';

interface Target {
  id: string;
  name: string;
  base_url: string;
  created_at: string;
}

export default function TargetListPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = async () => {
    try {
      const response = await api.get('/targets/');
      setTargets(response.data);
    } catch (error) {
      console.error('Failed to fetch targets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await api.delete(`/targets/${id}`);
      setTargets((t) => t.filter((x) => x.id !== id));
    } catch (error) {
      console.error('Failed to delete target', error);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Targets"
        subtitle="Web applications registered for scanning."
        actions={
          <Link to="/targets/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Target
            </Button>
          </Link>
        }
      />

      {targets.length === 0 ? (
        <EmptyState
          icon={<Crosshair className="h-8 w-8" />}
          title="No targets yet"
          description="Register a base URL to begin running DAST scans against it."
          action={
            <Link to="/targets/new">
              <Button>
                <Plus className="h-4 w-4" /> Add your first target
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full divide-y divide-line/70 text-sm">
            <thead className="bg-surface-2/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">URL</th>
                <th className="px-5 py-3 font-medium">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {targets.map((target) => (
                <tr key={target.id} className="group transition-colors hover:bg-surface-2/40">
                  <td className="px-5 py-4 font-medium">
                    <Link to={`/targets/${target.id}`} className="text-accent hover:underline">
                      {target.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
                      <Globe className="h-4 w-4 text-muted" />
                      {target.base_url}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {new Date(target.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => handleDelete(target.id, e)}
                      className="rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:bg-crit/10 hover:text-crit group-hover:opacity-100"
                      title={`Delete ${target.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
