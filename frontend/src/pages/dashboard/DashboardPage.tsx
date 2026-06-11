import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';
import { Plus, ScanLine, Crosshair, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import { PageHeader, StatCard, Card, Button, Spinner, EmptyState } from '@/components/ui';

interface TrendPoint { date: string; high: number; medium: number; id: string }
interface Stats { total_scans: number; total_targets: number; recent_trend: TrendPoint[] }

const tooltipStyle = {
  background: '#151e33',
  border: '1px solid #233150',
  borderRadius: 12,
  color: '#eaf0fb',
  fontSize: 12,
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/stats').then((r) => setStats(r.data))
      .catch((e) => console.error('Failed to fetch stats', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const trend = stats?.recent_trend ?? [];
  const totalHigh = trend.reduce((a, p) => a + (p.high || 0), 0);
  const totalMed = trend.reduce((a, p) => a + (p.medium || 0), 0);
  const donut = [
    { name: 'High', value: totalHigh, color: '#fb3a5d' },
    { name: 'Medium', value: totalMed, color: '#fbbf24' },
  ];
  const hasFindings = totalHigh + totalMed > 0;

  return (
    <div>
      <PageHeader
        title="Security Dashboard"
        subtitle="Live overview of your DAST coverage and recent findings."
        actions={
          <Link to="/targets/new">
            <Button><Plus className="h-4 w-4" /> New Scan</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scans" value={stats?.total_scans ?? 0} icon={<ScanLine className="h-5 w-5" />} />
        <StatCard label="Active Targets" value={stats?.total_targets ?? 0} icon={<Crosshair className="h-5 w-5" />} />
        <StatCard
          label="High Risk"
          value={totalHigh}
          accent={totalHigh > 0 ? 'text-crit' : 'text-ok'}
          hint="across recent scans"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Medium Risk"
          value={totalMed}
          accent={totalMed > 0 ? 'text-medium' : 'text-ok'}
          hint="across recent scans"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Trend */}
        <Card ring className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Vulnerability Trend</h3>
            <span className="text-xs text-faint">last {trend.length || 5} scans</span>
          </div>
          <div className="h-72">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb3a5d" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#fb3a5d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
                  <XAxis dataKey="date" stroke="#5d6e93" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5d6e93" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#233150' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Area type="monotone" dataKey="high" name="High" stroke="#fb3a5d" strokeWidth={2.5} fill="url(#gHigh)" />
                  <Area type="monotone" dataKey="medium" name="Medium" stroke="#fbbf24" strokeWidth={2.5} fill="url(#gMed)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<ScanLine className="h-7 w-7" />}
                title="No scan data yet"
                description="Run your first scan to populate vulnerability trends."
                action={<Link to="/targets/new"><Button><Plus className="h-4 w-4" /> Start a scan</Button></Link>}
              />
            )}
          </div>
        </Card>

        {/* Severity split donut */}
        <Card className="flex flex-col p-6">
          <h3 className="mb-3 text-sm font-semibold text-fg">Risk Distribution</h3>
          <div className="relative flex-1">
            {hasFindings ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">
                      {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ top: '-18px' }}>
                  <span className="text-3xl font-extrabold text-fg">{totalHigh + totalMed}</span>
                  <span className="text-[11px] uppercase tracking-widest text-faint">findings</span>
                </div>
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted">No findings yet</div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-center gap-5 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-crit" /> High {totalHigh}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-medium" /> Medium {totalMed}</span>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/targets">
          <Card className="group p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-base font-semibold text-fg">Manage Targets</h5>
                <p className="mt-1 text-sm text-muted">Add or remove web apps to scan.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </div>
          </Card>
        </Link>
        <Link to="/scans">
          <Card className="group p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-base font-semibold text-fg">View Scans</h5>
                <p className="mt-1 text-sm text-muted">Check scan history and reports.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
