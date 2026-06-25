"use client";

import { useState, useEffect } from "react";

const SOURCE_COLORS = {
    Remotive: "bg-green-100 text-green-700",
    RemoteOK: "bg-blue-100 text-blue-700",
    Jobicy: "bg-purple-100 text-purple-700",
    SimplifyJobs: "bg-orange-100 text-orange-700",
    TheMuse: "bg-pink-100 text-pink-700",
};

export default function Dashboard() {
    const [history, setHistory] = useState([]);
    const [applyUrl, setApplyUrl] = useState("");

    // Discovery filters
    const [jobType, setJobType] = useState("Internship");
    const [field, setField] = useState("Software Engineering");
    const [remoteOnly, setRemoteOnly] = useState(true);
    const [paid, setPaid] = useState("Any");
    const [location, setLocation] = useState("Any");
    const [sortBy, setSortBy] = useState("newest");

    const [discoveryResults, setDiscoveryResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [discoverLoading, setDiscoverLoading] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [activeTab, setActiveTab] = useState("discover");

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/applications");
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    const handleManualApply = async (e) => {
        if (e) e.preventDefault();
        if (!applyUrl) return;
        setLoading(true);
        try {
            const res = await fetch("/api/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: applyUrl }),
            });
            const data = await res.json();
            alert(data.message || data.error);
            fetchHistory();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
            setApplyUrl("");
        }
    };

    const handleDiscover = async (e) => {
        e.preventDefault();
        setDiscoverLoading(true);
        setDiscoveryResults(null);
        try {
            const res = await fetch("/api/discovery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobType, field, remoteOnly, paid, location, sortBy }),
            });
            const data = await res.json();
            setDiscoveryResults(data);
        } catch (err) {
            setDiscoveryResults({ error: err.message });
        } finally {
            setDiscoverLoading(false);
        }
    };

    const quickApply = async (url, idx) => {
        setApplyingId(idx);
        try {
            const res = await fetch("/api/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (data.error) alert("Error: " + data.error);
            fetchHistory();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setApplyingId(null);
        }
    };

    const updateStatus = async (id, status) => {
        await fetch("/api/applications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        fetchHistory();
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">⚡ AutoApplier</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Global Job Discovery · AI Copilot · Application Tracker</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveTab("discover")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "discover" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            🔍 Discover Jobs
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "history" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            📋 History {history.length > 0 && <span className="ml-1 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-full">{history.length}</span>}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

                {activeTab === "discover" && (
                    <>
                        {/* Filter Panel */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold mb-5 text-gray-900">🌐 Search Entire Internet for Jobs</h2>
                            <form onSubmit={handleDiscover}>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Job Type</label>
                                        <select value={jobType} onChange={e => setJobType(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
                                            <option value="Any">Any</option>
                                            <option value="Internship">Internship</option>
                                            <option value="Full-Time">Full-Time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Part-Time">Part-Time</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Field</label>
                                        <select value={field} onChange={e => setField(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
                                            <option value="Any">Any Field</option>
                                            <option value="Software Engineering">Software Engineering</option>
                                            <option value="Backend">Backend</option>
                                            <option value="Full Stack">Full Stack</option>
                                            <option value="Frontend">Frontend</option>
                                            <option value="Data/ML">Data / ML / AI</option>
                                            <option value="DevOps">DevOps / Cloud</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Location</label>
                                        <select value={location} onChange={e => setLocation(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
                                            <option value="Any">Anywhere</option>
                                            <option value="Remote">Remote</option>
                                            <option value="USA">USA</option>
                                            <option value="Europe">Europe</option>
                                            <option value="India">India</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Compensation</label>
                                        <select value={paid} onChange={e => setPaid(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
                                            <option value="Any">Paid or Unpaid</option>
                                            <option value="Paid">Paid Only</option>
                                            <option value="Unpaid">Unpaid Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sort By</label>
                                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
                                            <option value="newest">Newest First</option>
                                            <option value="relevance">Most Relevant</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                                            <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                                            <span className="text-sm text-gray-700 font-medium">Remote Only</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                    <button type="submit" disabled={discoverLoading}
                                        className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                                        {discoverLoading ? (
                                            <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Searching 6 Sources...</>
                                        ) : "🔍 Discover Jobs Now"}
                                    </button>
                                    {discoveryResults?.total > 0 && (
                                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                                            {discoveryResults.total} jobs found across the internet
                                        </span>
                                    )}
                                </div>
                            </form>
                        </section>

                        {/* Manual Apply */}
                        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Or paste a direct ATS URL</h2>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={applyUrl}
                                    onChange={e => setApplyUrl(e.target.value)}
                                    placeholder="https://boards.greenhouse.io/company/jobs/12345..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button onClick={handleManualApply} disabled={loading || !applyUrl}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
                                    {loading ? "Launching..." : "🪄 AI Copilot Apply"}
                                </button>
                            </div>
                        </section>

                        {/* Results Table */}
                        {discoveryResults && (
                            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="font-bold text-gray-900">
                                        Discovered Jobs
                                    </h2>
                                    <div className="flex gap-2 flex-wrap">
                                        {Object.entries(SOURCE_COLORS).map(([src, cls]) => (
                                            <span key={src} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{src}</span>
                                        ))}
                                    </div>
                                </div>

                                {discoveryResults.error ? (
                                    <div className="p-6 text-red-500">{discoveryResults.error}</div>
                                ) : discoveryResults.jobs?.length > 0 ? (
                                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Source</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Location</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Salary</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {discoveryResults.jobs.map((job, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[job.source] || "bg-gray-100 text-gray-600"}`}>
                                                                {job.source}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{job.company}</td>
                                                        <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                                                            <span className="line-clamp-2">{job.role}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                                            {job.isRemote && <span className="inline-block bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs mr-1">Remote</span>}
                                                            {job.location}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                                            {job.salary ? (
                                                                <span className="text-green-700 font-medium">{job.salary}</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right space-x-2">
                                                            <a href={job.url} target="_blank" rel="noreferrer"
                                                                className="inline-block px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                                                View
                                                            </a>
                                                            <button onClick={() => quickApply(job.applyUrl || job.url, idx)}
                                                                disabled={applyingId === idx}
                                                                className="inline-block px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60">
                                                                {applyingId === idx ? "⏳..." : "🪄 Auto-Apply"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-500">
                                        <div className="text-4xl mb-3">🔍</div>
                                        <p>No jobs matched your filters. Try broadening the search.</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}

                {activeTab === "history" && (
                    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900">Application History</h2>
                            <button onClick={fetchHistory} className="text-sm text-blue-600 hover:underline">Refresh</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">ATS</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                                <div className="text-3xl mb-2">📭</div>
                                                No applications tracked yet. Use Auto-Apply to get started!
                                            </td>
                                        </tr>
                                    ) : history.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-400">#{app.id}</td>
                                            <td className="px-4 py-3 font-medium">{app.company || '—'}</td>
                                            <td className="px-4 py-3 text-gray-700">{app.role || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{app.ats_platform || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {app.date_applied ? new Date(app.date_applied).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={app.status || 'Pending'}
                                                    onChange={e => updateStatus(app.id, e.target.value)}
                                                    className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer ${
                                                        app.status === 'Applied' ? 'bg-green-100 text-green-700 border-green-300' :
                                                        app.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                                                        app.status === 'Interview' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                        'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    }`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Applied">Applied ✓</option>
                                                    <option value="Interview">Interview 🎤</option>
                                                    <option value="Offered">Offered 🎉</option>
                                                    <option value="Rejected">Rejected ✗</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
