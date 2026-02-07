import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface Scan {
    id: string;
    target_id: string;
    status: string;
    profile: string;
    created_at: string;
    target: {
        name: string;
        base_url: string;
    }
}

export default function ScanListPage() {
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScans = async () => {
            try {
                const response = await api.get('/scans/');
                setScans(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchScans();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold">Scans</h1>
            <p className="text-gray-600">Scan history and status.</p>

            <div className="mt-8">
                {scans.length === 0 ? (
                    <p>No scans found. Go to <Link to="/targets" className="text-indigo-600 underline">Targets</Link> to start a new scan.</p>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {scans.map(scan => (
                                <li key={scan.id}>
                                    <Link to={`/scans/${scan.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-indigo-600 truncate">
                                                    {scan.target?.name || 'Unknown Target'}
                                                </p>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${scan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                            scan.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {scan.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        {scan.target?.base_url}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p>
                                                        Scan ID: {scan.id.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
