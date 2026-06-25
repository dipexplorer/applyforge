// Check if local server is running
async function checkStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    try {
        const res = await fetch('http://localhost:3000/api/profile', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className = 'dot green';
            text.textContent = 'Server connected ✓';
        } else {
            throw new Error('not ok');
        }
    } catch {
        dot.className = 'dot red';
        text.innerHTML = 'Server offline — <a href="http://localhost:3000" target="_blank">start it</a>';
    }
}
checkStatus();
