import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2, Play, Activity } from 'lucide-react';

interface Target {
    id: string;
    name: string;
    base_url: string;
}

export default function TargetDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [target, setTarget] = useState<Target | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingScan, setStartingScan] = useState(false);
    const navigate = useNavigate();

    const fetchTarget = async () => {
        try {
            const response = await api.get(`/targets/${id}`);
            setTarget(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTarget();
    }, [id]);

    const startScan = async (profile: 'quick' | 'full') => {
        if (!target) return;
        setStartingScan(true);
        try {
            const response = await api.post('/scans/', {
                target_id: target.id,
                profile: profile
            });
            alert(`Scan started! ID: ${response.data.id}`);
            navigate('/scans');
        } catch (error) {
            alert('Failed to start scan');
        } finally {
            setStartingScan(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!target) return <div>Target not found</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900">{target.name}</h1>
            <p className="text-gray-500 mt-1">{target.base_url}</p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium">Quick Scan</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Rapid spider and passive scan. Good for daily checks.
                    </p>
                    <button
                        onClick={() => startScan('quick')}
                        disabled={startingScan}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {startingScan ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Quick Scan
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-medium">Full Scan</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Deep crawl and active attacks. Intrusive. High load.
                    </p>
                    <button
                        onClick={() => startScan('full')}
                        disabled={startingScan}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        {startingScan ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Activity className="mr-2 h-4 w-4" />}
                        Run Full Scan
                    </button>
                </div>
            </div>
        </div>
    );
}
