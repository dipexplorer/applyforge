"use client";

import { useState, useEffect } from "react";

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [applyUrl, setApplyUrl] = useState("");
  
  // Discovery State
  const [jobType, setJobType] = useState("Internship");
  const [field, setField] = useState("Software Engineering");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleApply = async (e) => {
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
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setApplyUrl("");
      fetchHistory();
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
        body: JSON.stringify({ jobType, field, remoteOnly }),
      });
      const data = await res.json();
      setDiscoveryResults(data);
    } catch (err) {
      setDiscoveryResults({ error: err.message });
    } finally {
      setDiscoverLoading(false);
    }
  };

  const quickApply = async (url) => {
    try {
      await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      alert(`Application launched for ${url}`);
      fetchHistory();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="border-b border-gray-200 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">AutoApplier</h1>
          <p className="mt-2 text-lg text-gray-600">Global Job Discovery & Auto-Apply Engine</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-4">Manual Direct Apply</h2>
              <p className="text-sm text-gray-500 mb-4">Already have a Greenhouse or Lever link? Paste it here to auto-apply immediately.</p>
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ATS Job URL</label>
                  <input
                    type="text"
                    value={applyUrl}
                    onChange={(e) => setApplyUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </form>
            </div>
            <button
              onClick={handleApply}
              disabled={loading || !applyUrl}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Launching Playwright..." : "Apply Now"}
            </button>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Discover Jobs</h2>
            <form onSubmit={handleDiscover} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="Internship">Internship</option>
                    <option value="Full-Time">Full-Time / New Grad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="Any">Any Field</option>
                    <option value="Software Engineer">Software Engineering</option>
                    <option value="Backend">Backend</option>
                    <option value="Full Stack">Full Stack</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Data">Data Science / ML</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="remote"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="remote" className="ml-2 text-sm text-gray-700">Remote Opportunities Only</label>
              </div>
              <button
                type="submit"
                disabled={discoverLoading}
                className="w-full bg-gray-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {discoverLoading ? "Searching Globe..." : "Discover Jobs"}
              </button>
            </form>
          </section>
        </div>

        {/* Discovery Results Section */}
        {discoveryResults && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              Discovered Opportunities
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {discoveryResults.jobs?.length || 0} Found
              </span>
            </h2>
            {discoveryResults.error ? (
              <p className="text-red-500">{discoveryResults.error}</p>
            ) : discoveryResults.jobs && discoveryResults.jobs.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {discoveryResults.jobs.map((job, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{job.company}</td>
                        <td className="px-4 py-3 text-gray-700">{job.role}</td>
                        <td className="px-4 py-3 text-gray-500">{job.location}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <a 
                            href={job.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-block px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          >
                            View
                          </a>
                          <button 
                            onClick={() => quickApply(job.link)} 
                            className="inline-block px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Auto-Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No jobs matched your current filters. Try broadening your search.
              </div>
            )}
          </section>
        )}

        {/* History Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Application History</h2>
            <button onClick={fetchHistory} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 rounded-tr-lg font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No applications tracked yet.</td>
                  </tr>
                ) : (
                  history.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">#{app.id}</td>
                      <td className="px-4 py-3">{app.company || '-'}</td>
                      <td className="px-4 py-3">{app.role || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{app.date_applied ? new Date(app.date_applied).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${app.status === 'Applied' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {app.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
