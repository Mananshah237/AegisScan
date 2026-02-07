import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { Loader2, Plus } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/stats/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Security Dashboard</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                {/* Stat Cards */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Scans</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.total_scans || 0}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Targets</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.total_targets || 0}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-6 flex items-center justify-center h-full">
                        <Link to="/targets/new" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                            <Plus className="mr-2 h-4 w-4" /> New Scan
                        </Link>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Vulnerability Trends (Last 5 Scans)</h3>
                <div className="h-64">
                    {stats?.recent_trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.recent_trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="high" stroke="#ef4444" name="High Risk" strokeWidth={2} />
                                <Line type="monotone" dataKey="medium" stroke="#f97316" name="Medium Risk" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                            No scan data available yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link to="/targets" className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100">
                    <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">Manage Targets</h5>
                    <p className="font-normal text-gray-700">Add or remove websites to scan.</p>
                </Link>
                <Link to="/scans" className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100">
                    <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">View Scans</h5>
                    <p className="font-normal text-gray-700">Check scan history and reports.</p>
                </Link>
            </div>
        </div>
    );
}
