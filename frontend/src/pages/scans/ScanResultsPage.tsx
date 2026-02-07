import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

interface Finding {
    id: string;
    title: string;
    severity: 'High' | 'Medium' | 'Low' | 'Informational' | 'Info';
    confidence: string;
    endpoint_url: string;
    description: string;
    risk_score: number;
}

const severityColors = {
    High: 'text-red-700 bg-red-50 border-red-200',
    Medium: 'text-orange-700 bg-orange-50 border-orange-200',
    Low: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    Informational: 'text-blue-700 bg-blue-50 border-blue-200',
    Info: 'text-blue-700 bg-blue-50 border-blue-200',
};

export default function ScanResultsPage() {
    const { id } = useParams<{ id: string }>();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFindings = async () => {
            try {
                const response = await api.get('/findings/', { params: { scan_id: id } });
                setFindings(response.data);
            } catch (error) {
                console.error('Failed to fetch findings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFindings();
    }, [id]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <Link to="/scans" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← Back to Scans</Link>
                    <h1 className="text-2xl font-bold">Scan Results</h1>
                    <p className="text-gray-600">Findings for scan {id}</p>
                </div>
                <div>
                    <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/scans/${id}/report`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <ShieldAlert className="mr-2 h-4 w-4 text-gray-400" />
                        Download Report
                    </a>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Severity</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Title</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Endpoint</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Risk Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {findings.map((finding) => (
                                        <tr key={finding.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                <span className={clsx(
                                                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                    severityColors[finding.severity] || severityColors.Info
                                                )}>
                                                    {finding.severity}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-900 font-medium">
                                                {finding.title}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-500 font-mono text-xs break-all max-w-xs">
                                                {finding.endpoint_url}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {finding.risk_score}
                                            </td>
                                        </tr>
                                    ))}
                                    {findings.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-500">
                                                No findings found. Secure! (Or failed scan)
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
