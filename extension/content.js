/**
 * AutoApplier Copilot — Content Script
 * Injected into Greenhouse & Lever job pages.
 * Shows floating AI tooltip when user clicks any input field.
 */

const API_BASE = 'http://localhost:3000';

let activeField = null;
let tooltip = null;
let profile = null;

// ─── Load profile from local server ────────────────────────────────────────
async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/profile`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// ─── Toast notifications ────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
    const existing = document.getElementById('aa-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'aa-toast';
    toast.className = `aa-toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ─── Get label for a field ──────────────────────────────────────────────────
function getFieldLabel(field) {
    // 1. aria-label
    if (field.getAttribute('aria-label')) return field.getAttribute('aria-label');

    // 2. Associated <label>
    const id = field.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.innerText.trim();
    }

    // 3. Closest container label
    const container = field.closest('li, div.field, div.form-group, section, .application-question');
    if (container) {
        const lbl = container.querySelector('label, .label, .application-label, legend, h4, h3, p strong');
        if (lbl) return lbl.innerText.trim();
    }

    // 4. placeholder or name
    return field.placeholder || field.name || field.id || 'Describe yourself';
}

// ─── Check if field should trigger copilot ─────────────────────────────────
function isTargetField(field) {
    const tag = field.tagName.toLowerCase();
    const type = (field.type || '').toLowerCase();

    // Always trigger on textareas
    if (tag === 'textarea') return true;

    // Text inputs — skip basic identity fields
    if (tag === 'input' && type === 'text') {
        const skipIds = ['first_name', 'last_name', 'email', 'phone', 'name'];
        const skipNames = ['name', 'email', 'phone', 'org'];
        if (skipIds.includes(field.id)) return false;
        if (skipNames.includes(field.name)) return false;
        return true;
    }

    return false;
}

// ─── Remove tooltip ─────────────────────────────────────────────────────────
function removeTooltip() {
    if (tooltip) { tooltip.remove(); tooltip = null; }
}

// ─── Position tooltip near field ────────────────────────────────────────────
function positionTooltip(field) {
    const rect = field.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX;

    // Keep inside viewport
    const maxLeft = window.innerWidth - 340;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    return { top, left };
}

// ─── Show tooltip ───────────────────────────────────────────────────────────
function showTooltip(field) {
    removeTooltip();
    activeField = field;

    const question = getFieldLabel(field);
    const { top, left } = positionTooltip(field);

    tooltip = document.createElement('div');
    tooltip.id = 'aa-tooltip';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.position = 'absolute';

    tooltip.innerHTML = `
        <button class="aa-close" title="Close">×</button>
        <div class="aa-header">
            <span class="aa-dot"></span>
            AutoApplier Copilot
        </div>
        <div class="aa-question">${question.length > 120 ? question.slice(0, 120) + '…' : question}</div>
        <button class="aa-btn aa-btn-generate" id="aa-generate-btn">
            🪄 Generate AI Answer
        </button>
        <button class="aa-btn aa-btn-autofill" id="aa-autofill-btn">
            ⚡ Auto-fill All Fields
        </button>
    `;

    document.body.appendChild(tooltip);

    // Generate answer
    tooltip.querySelector('#aa-generate-btn').addEventListener('click', async () => {
        await generateAnswer(field, question);
    });

    // Auto-fill all basic fields
    tooltip.querySelector('#aa-autofill-btn').addEventListener('click', async () => {
        await autoFillAll();
    });

    // Close
    tooltip.querySelector('.aa-close').addEventListener('click', removeTooltip);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', (e) => {
            if (tooltip && !tooltip.contains(e.target) && e.target !== field) {
                removeTooltip();
            }
        }, { once: true });
    }, 100);
}

// ─── Generate AI answer for a specific field ────────────────────────────────
async function generateAnswer(field, question) {
    const btn = tooltip?.querySelector('#aa-generate-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="aa-spinner"></span> Generating...';
    }

    try {
        const res = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        const answer = data.answer;

        // Fill the field
        const nativeInputSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
        ) || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');

        if (nativeInputSetter?.set) {
            nativeInputSetter.set.call(field, answer);
        } else {
            field.value = answer;
        }

        field.dispatchEvent(new Event('input',  { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.classList.add('aa-filled');

        removeTooltip();
        showToast('✨ AI answer generated!', 'success');

    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🪄 Generate AI Answer';
        }
        showToast(`❌ Error: ${err.message}. Is localhost:3000 running?`, 'error', 5000);
    }
}

// ─── Auto-fill all basic identity fields ────────────────────────────────────
async function autoFillAll() {
    const btn = tooltip?.querySelector('#aa-autofill-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="aa-spinner"></span> Filling...';
    }

    if (!profile) profile = await loadProfile();

    if (!profile?.personal) {
        showToast('❌ Could not load profile. Is localhost:3000 running?', 'error', 5000);
        if (btn) { btn.disabled = false; btn.innerHTML = '⚡ Auto-fill All Fields'; }
        return;
    }

    const p = profile.personal;
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();

    const fieldMap = [
        // Greenhouse
        { sel: 'input#first_name',   val: p.first_name },
        { sel: 'input#last_name',    val: p.last_name },
        { sel: 'input#email',        val: p.email },
        { sel: 'input#phone',        val: p.phone },
        // Lever
        { sel: 'input[name="name"]',  val: fullName },
        { sel: 'input[name="email"]', val: p.email },
        { sel: 'input[name="phone"]', val: p.phone },
        { sel: 'input[name="org"]',   val: profile.education?.[0]?.university },
        // URLs
        { sel: 'input[name*="linkedin" i], input[autocomplete*="linkedin" i]', val: p.linkedin },
        { sel: 'input[name*="github" i]',    val: p.github },
        { sel: 'input[name*="portfolio" i], input[name*="website" i]', val: p.website },
        { sel: 'input[name*="twitter" i]',   val: p.twitter },
    ];

    let filled = 0;
    for (const { sel, val } of fieldMap) {
        if (!val) continue;
        try {
            const el = document.querySelector(sel);
            if (el && !el.value) {
                el.value = val;
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.classList.add('aa-filled');
                filled++;
            }
        } catch { /* skip */ }
    }

    removeTooltip();
    showToast(`⚡ Filled ${filled} field${filled !== 1 ? 's' : ''} automatically!`, 'success');
}

// ─── Attach focus listeners ─────────────────────────────────────────────────
function attachListeners() {
    document.addEventListener('focusin', (e) => {
        const field = e.target;
        if (!isTargetField(field)) return;
        showTooltip(field);
    });

    // Reposition on scroll
    window.addEventListener('scroll', () => {
        if (tooltip && activeField) {
            const { top, left } = positionTooltip(activeField);
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        }
    });
}

// ─── Auto-fill on page load ─────────────────────────────────────────────────
async function autoFillOnLoad() {
    await new Promise(r => setTimeout(r, 1500)); // wait for React/dynamic forms
    profile = await loadProfile();
    if (!profile) return;

    const p = profile.personal;
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();

    const fieldMap = [
        { sel: 'input#first_name',   val: p.first_name },
        { sel: 'input#last_name',    val: p.last_name },
        { sel: 'input#email',        val: p.email },
        { sel: 'input#phone',        val: p.phone },
        { sel: 'input[name="name"]',  val: fullName },
        { sel: 'input[name="email"]', val: p.email },
        { sel: 'input[name="phone"]', val: p.phone },
        { sel: 'input[name="org"]',   val: profile.education?.[0]?.university },
        { sel: 'input[name*="linkedin" i]', val: p.linkedin },
        { sel: 'input[name*="github" i]',   val: p.github },
    ];

    let filled = 0;
    for (const { sel, val } of fieldMap) {
        if (!val) continue;
        try {
            const el = document.querySelector(sel);
            if (el && !el.value) {
                el.value = val;
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.classList.add('aa-filled');
                filled++;
            }
        } catch { /* skip */ }
    }

    if (filled > 0) {
        showToast(`⚡ Auto-filled ${filled} field${filled !== 1 ? 's' : ''} from your profile!`, 'success', 4000);
    }
}

// ─── Init ───────────────────────────────────────────────────────────────────
attachListeners();
autoFillOnLoad();
