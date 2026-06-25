document.addEventListener('DOMContentLoaded', () => {
    
    const btnApply = document.getElementById('btn-apply');
    const applyUrl = document.getElementById('apply-url');
    const btnScrape = document.getElementById('btn-scrape');
    const scrapeUrl = document.getElementById('scrape-url');
    const scrapeKeyword = document.getElementById('scrape-keyword');
    const scrapeResults = document.getElementById('scrape-results');
    const historyTable = document.querySelector('#history-table tbody');

    // Fetch History on load
    fetchHistory();

    btnApply.addEventListener('click', async () => {
        const url = applyUrl.value.trim();
        if (!url) return alert("Please enter a URL");
        
        btnApply.textContent = "Launching...";
        btnApply.disabled = true;

        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            alert(data.message || data.error);
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            btnApply.textContent = "Apply Now";
            btnApply.disabled = false;
        }
    });

    btnScrape.addEventListener('click', async () => {
        let url = scrapeUrl.value.trim();
        if (!url) return alert("Please enter a target board (e.g. figma or https://boards.greenhouse.io/figma)");
        
        if (!url.startsWith('http')) {
            url = `https://boards.greenhouse.io/${url}`;
        }

        const keyword = scrapeKeyword.value.trim();
        
        btnScrape.textContent = "Scraping...";
        btnScrape.disabled = true;
        scrapeResults.innerHTML = '';

        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardUrl: url, keyword })
            });
            const data = await res.json();
            
            if (data.error) {
                scrapeResults.innerHTML = `<p style="color: #ef4444;">Error: ${data.error}</p>`;
                return;
            }

            if (data.links && data.links.length > 0) {
                data.links.forEach(link => {
                    const div = document.createElement('div');
                    div.className = 'job-link-item';
                    div.innerHTML = `
                        <a href="${link}" target="_blank">${link}</a>
                        <button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="quickApply('${link}')">Apply</button>
                    `;
                    scrapeResults.appendChild(div);
                });
            } else {
                scrapeResults.innerHTML = `<p style="color: var(--text-muted);">No jobs found matching the criteria.</p>`;
            }

        } catch (err) {
            scrapeResults.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}</p>`;
        } finally {
            btnScrape.textContent = "Scrape Links";
            btnScrape.disabled = false;
        }
    });

    async function fetchHistory() {
        try {
            const res = await fetch('/api/applications');
            const data = await res.json();
            
            historyTable.innerHTML = '';
            
            if (data.length === 0) {
                historyTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No applications found yet.</td></tr>`;
                return;
            }

            data.forEach(app => {
                const tr = document.createElement('tr');
                const statusClass = app.status === 'Applied' ? 'applied' : 'pending';
                tr.innerHTML = `
                    <td>#${app.id}</td>
                    <td>${app.company || 'Unknown'}</td>
                    <td>${app.role || 'Unknown'}</td>
                    <td>${app.date_applied ? new Date(app.date_applied).toLocaleDateString() : 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${app.status || 'Pending'}</span></td>
                `;
                historyTable.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    }

    // Expose for inline onclick
    window.quickApply = async function(url) {
        try {
            await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            alert("Application launched for " + url);
        } catch(e) {
            alert(e.message);
        }
    }
});
