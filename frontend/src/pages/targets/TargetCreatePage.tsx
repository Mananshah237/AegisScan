import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';

const targetSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    base_url: z.string().url('Must be a valid URL (http/https)')
});

type TargetForm = z.infer<typeof targetSchema>;

export default function TargetCreatePage() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm<TargetForm>({
        resolver: zodResolver(targetSchema)
    });

    const onSubmit = async (data: TargetForm) => {
        setLoading(true);
        setError('');
        try {
            await api.post('/targets/', data);
            navigate('/targets');
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail;
            // Handle array of errors or string
            if (Array.isArray(detail)) {
                setError(detail.map((e: any) => e.msg).join(', '));
            } else {
                setError(detail || 'Failed to create target');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link to="/targets" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Targets
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Add New Target</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Define a new web application to scan.
                </p>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Target Name
                            </label>
                            <div className="mt-1">
                                <input
                                    {...register('name')}
                                    type="text"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="e.g. Production Web App"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="base_url" className="block text-sm font-medium text-gray-700">
                                Base URL
                            </label>
                            <div className="mt-1">
                                <input
                                    {...register('base_url')}
                                    type="url"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="https://example.com"
                                />
                                {errors.base_url && <p className="text-red-500 text-xs mt-1">{errors.base_url.message}</p>}
                                <p className="mt-2 text-xs text-gray-500">
                                    Must be accessible from the internet (no localhost or private IPs).
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/targets')}
                                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mr-3"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Target
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
