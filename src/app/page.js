"use client";

import { useState, useEffect } from "react";

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [applyUrl, setApplyUrl] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeKeyword, setScrapeKeyword] = useState("");
  const [scrapeResults, setScrapeResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);

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
    e.preventDefault();
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
    }
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl) return;
    
    let targetUrl = scrapeUrl;
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://boards.greenhouse.io/${targetUrl}`;
    }

    setScrapeLoading(true);
    setScrapeResults(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardUrl: targetUrl, keyword: scrapeKeyword }),
      });
      const data = await res.json();
      setScrapeResults(data);
    } catch (err) {
      setScrapeResults({ error: err.message });
    } finally {
      setScrapeLoading(false);
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
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="border-b border-gray-200 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">AutoApplier</h1>
          <p className="mt-2 text-lg text-gray-600">Clean, Fast, Automated Application Dashboard</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Direct Apply</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Greenhouse Job URL</label>
                <input
                  type="text"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://boards.greenhouse.io/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Launching Playwright..." : "Apply Now"}
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Scrape Job Board</h2>
            <form onSubmit={handleScrape} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Board</label>
                  <input
                    type="text"
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="e.g. figma"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
                  <input
                    type="text"
                    value={scrapeKeyword}
                    onChange={(e) => setScrapeKeyword(e.target.value)}
                    placeholder="e.g. Intern"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={scrapeLoading}
                className="w-full bg-gray-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {scrapeLoading ? "Scraping..." : "Find Jobs"}
              </button>
            </form>

            {scrapeResults && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                {scrapeResults.error ? (
                  <p className="text-red-500 text-sm">{scrapeResults.error}</p>
                ) : scrapeResults.links && scrapeResults.links.length > 0 ? (
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {scrapeResults.links.map((link, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-200">
                        <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 truncate mr-2 hover:underline">{link}</a>
                        <button onClick={() => quickApply(link)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">Apply</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No jobs matched your criteria.</p>
                )}
              </div>
            )}
          </section>
        </div>

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
