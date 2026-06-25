/**
 * AutoApplier Copilot — Content Script
 * Injected into Greenhouse & Lever job pages.
 * Shows an inline AI button next to every input field. No automatic filling.
 */

const API_BASE = 'http://localhost:3000';
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
    if (field.getAttribute('aria-label')) return field.getAttribute('aria-label');
    const id = field.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.innerText.trim();
    }
    const container = field.closest('li, div.field, div.form-group, section, .application-question');
    if (container) {
        const lbl = container.querySelector('label, .label, .application-label, legend, h4, h3, p strong');
        if (lbl) return lbl.innerText.trim();
    }
    return field.placeholder || field.name || field.id || 'Describe yourself';
}

// ─── Generate AI answer / autofill specific field ─────────────────────────
async function handleFieldFill(field, btn, label) {
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="aa-spinner"></span>...';

    try {
        // Load profile if not loaded
        if (!profile) {
            profile = await loadProfile();
        }

        // We check if it's a basic field that can be mapped directly first
        const p = profile?.personal || {};
        const basicMappings = {
            'first_name': p.first_name,
            'last_name': p.last_name,
            'email': p.email,
            'phone': p.phone,
            'name': `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            'org': profile?.education?.[0]?.university,
            'linkedin': p.linkedin,
            'github': p.github,
            'portfolio': p.website,
            'website': p.website,
            'twitter': p.twitter
        };

        let directMatch = null;
        for (const [key, val] of Object.entries(basicMappings)) {
            const id = (field.id || '').toLowerCase();
            const name = (field.name || '').toLowerCase();
            if ((id.includes(key) || name.includes(key)) && val) {
                directMatch = val;
                break;
            }
        }

        let answer = directMatch;

        // If it's not a basic field, we ask Gemini
        if (!answer) {
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: label }),
            });

            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            answer = data.answer;
        }

        // Set value correctly
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

        btn.innerHTML = '✨ Done';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 2000);

    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '❌ Error';
        showToast(`❌ Error: ${err.message}. Is localhost:3000 running?`, 'error', 5000);
        setTimeout(() => { btn.innerHTML = originalText; }, 3000);
    }
}

// ─── Inject buttons next to all input fields ──────────────────────────────
function injectButtons() {
    // Target standard text inputs, email, tel, url, and textareas
    const fields = document.querySelectorAll('textarea, input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type])');
    
    fields.forEach((field) => {
        // Skip hidden fields or fields that already have the button
        if (field.type === 'hidden' || field.style.display === 'none') return;
        
        // Find if button already exists right after the field
        const wrapperExists = field.parentElement?.classList?.contains('aa-field-wrapper');
        if (wrapperExists) return;

        // Create a wrapper for the field to position the button cleanly
        const wrapper = document.createElement('div');
        wrapper.className = 'aa-field-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = field.style.display === 'block' ? 'block' : 'inline-block';
        wrapper.style.width = '100%';

        // Move field into wrapper
        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);

        // Create the AI button
        const btn = document.createElement('button');
        btn.className = 'aa-inline-btn';
        btn.innerHTML = '🪄 AI Fill';
        btn.type = 'button';
        btn.title = "Fill this field with AI";

        const label = getFieldLabel(field);
        
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFieldFill(field, btn, label);
        };

        wrapper.appendChild(btn);
    });
}

// DO NOT run on the local dashboard itself (avoids React hydration errors)
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    
    function initApplier() {
        injectButtons();
        
        // Observe mutations for dynamically loaded forms (e.g. Lever/Greenhouse JS)
        if (document.body) {
            const observer = new MutationObserver(() => {
                // debounce slightly to avoid performance hits
                clearTimeout(window.aaInjectTimeout);
                window.aaInjectTimeout = setTimeout(injectButtons, 200);
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Run once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApplier);
    } else {
        initApplier();
    }
}

