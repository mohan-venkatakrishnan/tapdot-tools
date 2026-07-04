// tapdot tools — shared utilities + shell (v7)

// ── Dark mode ────────────────────────────────────────────────────────────
// The actual dark/light DECISION happens in an inline <script> in <head> on
// every page (before first paint) — that's what prevents a light-mode flash
// on load/back-navigation. This just wires the toggle button + icon.

const SUN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function syncThemeIcon() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark ? SUN_ICON : MOON_ICON;
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function initDarkToggle() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;
  syncThemeIcon();
  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tapdot-theme', next);
    syncThemeIcon();
  });
}

// ── Copy to clipboard ──────────────────────────────────────────────────────

function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  if (done) done();
}

// ── Output show / hide ──────────────────────────────────────────────────────

function showOutput(id) { const el = document.getElementById(id); if (el) el.classList.add('visible'); }
function hideOutput(id) { const el = document.getElementById(id); if (el) el.classList.remove('visible'); }

// ── Escape HTML ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── On-device AI (Gemini Nano) — shared by BiasCheck, FlashForge, … ─────────
// Returns 'available' | 'downloadable' | 'downloading' | 'unavailable'.
const tapdotAI = {
  async availability() {
    try {
      if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.availability) {
        const a = await self.LanguageModel.availability();
        if (a === 'available' || a === 'readily') return 'available';
        if (a === 'downloadable' || a === 'after-download') return 'downloadable';
        if (a === 'downloading') return 'downloading';
        return 'unavailable';
      }
      const ai = (typeof window !== 'undefined') ? window.ai : null;
      const ns = ai && (ai.languageModel || ai.assistant);
      if (ns && ns.capabilities) {
        const c = await ns.capabilities();
        const v = c && c.available;
        if (v === 'readily') return 'available';
        if (v === 'after-download') return 'downloadable';
        if (v && v !== 'no') return 'downloading';
      }
    } catch (e) { /* fall through */ }
    return 'unavailable';
  },
  async createSession(onProgress) {
    const monitor = (m) => {
      if (m && m.addEventListener) {
        m.addEventListener('downloadprogress', (e) => {
          const pct = e.total ? e.loaded / e.total : e.loaded;
          if (onProgress) onProgress(Math.round(Math.min(1, pct || 0) * 100));
        });
      }
    };
    if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.create) {
      return await self.LanguageModel.create({ monitor });
    }
    const ai = (typeof window !== 'undefined') ? window.ai : null;
    const ns = ai && (ai.languageModel || ai.assistant);
    if (ns && ns.create) return await ns.create({ monitor });
    throw new Error('No on-device AI API');
  },
};

// ── Icon set (categories + tools) ───────────────────────────────────────────

const ICON_PATHS = {
  tools: '<path d="M6 5h12"/><path d="M12 5v9"/><circle cx="12" cy="18.5" r="2"/>',
  study: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
  write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  'CiteMaker': '<path d="M6 17h3l2-4V7H5v6h3z"/><path d="M16 17h3l2-4V7h-6v6h3z"/>',
  'FlashForge': '<rect x="3" y="8" width="13" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
  'GradeCalc': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01"/>',
  'BiasCheck': '<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
  'ReadScore': '<path d="M4 20a8 8 0 0 1 16 0"/><path d="M12 20l4-6"/>',
  'WordCount Pro': '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  'LoremCraft': '<path d="M4 6h16M4 12h16M4 18h10"/>',
  'ThreadCraft': '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.5 8.5 0 1 1 21 11.5z"/>',
  dev: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  marketing: '<path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M16 8a4 4 0 0 1 0 8"/><path d="M19 5a8 8 0 0 1 0 14"/>',
  finance: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.3c0-1.1 1-2 2.5-2s2.5.9 2.5 1.7c0 2-5 1-5 3 0 .8 1 1.7 2.5 1.7s2.5-.9 2.5-2"/>',
  legal: '<path d="M8.5 8.5L2.5 14.5"/><path d="M13 3l6 6-2.5 2.5-6-6z"/><path d="M8.5 7.5l6 6-1.5 1.5-6-6z"/><path d="M2 20h9"/>',
  hr: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ai: '<path d="M12 2a4 4 0 0 1 4 4c2.5.6 4 2.6 4 5a5 5 0 0 1-2 4v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3a5 5 0 0 1-2-4c0-2.4 1.5-4.4 4-5a4 4 0 0 1 4-4z"/><circle cx="9.5" cy="11" r="1"/><circle cx="14.5" cy="11" r="1"/>',
  health: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  design: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/>',
  productivity: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  'UTMBuilder': '<path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M16 8a4 4 0 0 1 0 8"/><path d="M19 5a8 8 0 0 1 0 14"/>',
  'HeadlineScore': '<path d="M4 12h16M4 6h16M4 18h10"/>',
  'EmailSubjectTester': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
  'AdCopyWriter': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  'SocialCalendar': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  'PersonaBuilder': '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/>',
  'CompetitorMatrix': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  'ROICalculator': '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.3c0-1.1 1-2 2.5-2s2.5.9 2.5 1.7c0 2-5 1-5 3 0 .8 1 1.7 2.5 1.7s2.5-.9 2.5-2"/>',
  'CompoundCalc': '<path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-4 4"/>',
  'BudgetPlanner': '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3"/>',
  'MortgageCalc': '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  'InvestmentTracker': '<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/>',
  'TaxEstimate': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  'CurrencyConvert': '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  'EquityCalc': '<circle cx="7" cy="7" r="4"/><circle cx="17" cy="17" r="4"/><path d="M10 10l4 4"/>',
  'NetWorthTracker': '<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
  'ContractRead': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/>',
  'NDAGenerator': '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'PrivacyPolicyGen': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'TermsBuilder': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  'CopyrightChecker': '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
  'LegalGlossary': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'SalaryBand': '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  'JobDescriptionWriter': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  'InterviewKit': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'OfferLetterBuilder': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/>',
  'OnboardingChecklist': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  'LeaveCalculator': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  'BMICalc': '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  'MedicationLog': '<path d="M10.5 20.5L3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="M8.5 8.5l7 7"/>',
  'SymptomDiary': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><circle cx="9" cy="15" r="1.4"/><circle cx="15" cy="13" r="1.4"/>',
  'CycleTracker': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  'WaterIntake': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'SleepLog': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  'Base64Tool': '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M9 15V9h2a2 2 0 0 1 0 4H9m6 2v-4a2 2 0 0 1 4 0v4"/>',
  'DiffCheck': '<path d="M12 3v18"/><path d="M8 8H3v13h5zM21 3h-5v13h5z"/>',
  'WSTester': '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/><path d="M2 8.82a15 15 0 0 1 20 0"/>',
  'CodePlay': '<polygon points="10 8 16 12 10 16 10 8"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  'BigOCheck': '<path d="M4 19c4-14 12-14 16 0"/><path d="M4 5h16"/>',
  'WorldClock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><path d="M12 3a15 15 0 0 1 0 18"/>',
  'SketchPad': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  'PhotoTune': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><path d="M14 3v4M18 5h-4" stroke-width="1.5"/>',
  'UnitConvert': '<path d="M16 3h5v5M8 21H3v-5"/><path d="M21 3l-7 7M3 21l7-7"/><path d="M14 14h7v7h-7z" stroke-dasharray="2 2"/>',
  'AISummarize': '<path d="M4 6h16M4 12h10M4 18h6"/>',
  'AITranslate': '<path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1"/><path d="M22 22l-5-10-5 10M14 18h6"/>',
  'LoanCalc': '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
  'RetireCalc': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  'InflationCalc': '<path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
  'PaletteForge': '<circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12.5" r="0.5"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a5 5 0 0 0 5-5c0-5-4.5-8.5-10-8.5z"/>',
  'TypographyScale': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  'IconExplorer': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  'ShadowStudio': '<rect x="4" y="4" width="13" height="13" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V9" stroke-dasharray="2 2"/>',
  'SpacingCalc': '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/>',
  'GradientMaker': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/>',
  'FocusTimer': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'QuickNote': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  'DecisionMatrix': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  'MeetingTimer': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>',
  'HabitTracker': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  'ReadingList': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'JSONLab': '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>',
  'JSONConvert': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  'JWTStudio': '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M17 6l2 2M14 9l2 2"/>',
  'YAMLCheck': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  'CSVExplore': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  'MarkdownLive': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6M17 9v5M14.6 12.4L17 15l2.4-2.6"/>',
  'HTMLPreview': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.01M9 6.5h.01"/>',
  'SQLFormat': '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  'ColourContrast': '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  'UUIDGen': '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>',
  'TimezoneNow': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'TZConvert': '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
  'RegexLab': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  'CronLab': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M12 13v3l2 1"/>',
};
function svgIcon(paths) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
}
const ICONS = Object.fromEntries(Object.entries(ICON_PATHS).map(([k, v]) => [k, svgIcon(v)]));

// Per-page favicon "tile" reflecting the collection / tool.
function initFavicon() {
  const col = document.documentElement.dataset.collection || 'tools';
  const tool = document.documentElement.dataset.tool || '';
  const color = {
    tools: '#5B6CF0', study: '#12A594', write: '#D97757', dev: '#5B6CF0',
    marketing: '#D6537E', finance: '#4E9B6B', legal: '#5C6FB8', hr: '#B0609E',
    health: '#4E8FC4', design: '#8A5CD6', productivity: '#3D9AA6', ai: '#D96C4F',
  }[col] || '#5B6CF0';
  const paths = ICON_PATHS[tool] || ICON_PATHS[col] || ICON_PATHS.tools;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<rect width="24" height="24" rx="6" fill="' + color + '"/>' +
    '<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</g></svg>';
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── Searchable dropdown (progressive enhancement for long <select> lists) ───
// Add `data-searchable` to any <select> with many options (e.g. a 36-city
// timezone picker) and it becomes a themed, type-to-filter combobox. The
// original <select> stays in the DOM (hidden) and keeps firing 'change' /
// 'input' — tool scripts that read `select.value` need zero changes.

function enhanceSearchableSelects() {
  document.querySelectorAll('select[data-searchable]').forEach((sel) => {
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = '1';

    const wrap = document.createElement('div');
    wrap.className = 'ts-ssel';
    if (sel.classList.contains('ts-grow')) wrap.classList.add('ts-grow');
    if (sel.getAttribute('style')) { wrap.setAttribute('style', sel.getAttribute('style')); sel.removeAttribute('style'); }
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('ts-ssel-native');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ts-ssel-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'ts-ssel-label';
    btn.appendChild(labelSpan);
    btn.insertAdjacentHTML('beforeend',
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>');
    wrap.appendChild(btn);

    const syncLabel = () => {
      const opt = sel.options[sel.selectedIndex];
      labelSpan.textContent = opt ? opt.textContent : '';
    };
    syncLabel();
    // Tool scripts sometimes populate/select options asynchronously (e.g. after
    // a fetch) — re-sync the visible label whenever the underlying select
    // changes from ANY source, not just our own panel.
    sel.addEventListener('change', syncLabel);

    let panel = null;
    function close() {
      if (!panel) return;
      panel.remove(); panel = null;
      document.removeEventListener('click', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
    }
    function onOutside(e) { if (!wrap.contains(e.target)) close(); }

    let activeIdx = 0, items = [];
    function filterItems(q) {
      q = q.trim().toLowerCase();
      items = [...sel.options].filter(o => !q || o.textContent.toLowerCase().includes(q));
      return items;
    }
    function renderList(q) {
      const list = panel.querySelector('.ts-ssel-list');
      const opts = filterItems(q);
      activeIdx = Math.max(0, opts.findIndex(o => o.value === sel.value));
      if (!opts.length) { list.innerHTML = '<div class="ts-ssel-empty">No matches</div>'; return; }
      list.innerHTML = opts.map((o, i) =>
        `<div class="ts-ssel-opt${o.value === sel.value ? ' selected' : ''}${i === activeIdx ? ' active' : ''}" data-v="${escapeHtml(o.value)}" role="option">${escapeHtml(o.textContent)}</div>`
      ).join('');
      const activeEl = list.querySelector('.ts-ssel-opt.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
    function choose(value) {
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      syncLabel();
      close();
      btn.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); reflectActive(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); reflectActive(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (items[activeIdx]) choose(items[activeIdx].value); }
    }
    function reflectActive() {
      const list = panel.querySelector('.ts-ssel-list');
      [...list.children].forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      const activeEl = list.children[activeIdx];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      if (panel) return;
      panel = document.createElement('div');
      panel.className = 'ts-ssel-panel';
      panel.innerHTML =
        '<div class="ts-ssel-search-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
        '<input class="ts-ssel-search" placeholder="Search…" autocomplete="off" spellcheck="false" /></div>' +
        '<div class="ts-ssel-list" role="listbox"></div>';
      wrap.appendChild(panel);
      renderList('');
      const input = panel.querySelector('.ts-ssel-search');
      input.focus();
      input.addEventListener('input', () => renderList(input.value));
      panel.querySelector('.ts-ssel-list').addEventListener('click', (e) => {
        const opt = e.target.closest('.ts-ssel-opt'); if (opt) choose(opt.dataset.v);
      });
      setTimeout(() => document.addEventListener('click', onOutside, true), 0);
      document.addEventListener('keydown', onKey, true);
    }

    btn.addEventListener('click', () => (panel ? close() : open()));
  });
}

// ── Global search / command palette (click or Cmd+K / Ctrl+K) ───────────────
// To register a new tool so it's searchable, add one entry here.

const TOOL_REGISTRY = [
  { name: 'Tools', url: '/', collection: 'tools', desc: 'Home — study, write and dev tools' },
  { name: 'Study tools', url: '/study/', collection: 'study', desc: 'Citations, flashcards, grades, bias check' },
  { name: 'Write tools', url: '/write/', collection: 'write', desc: 'Readability, word count, lorem, threads' },
  { name: 'Dev tools', url: '/dev/', collection: 'dev', desc: 'JSON, JWT, YAML, regex, cron and more' },
  { name: 'CiteMaker', url: '/study/cite/', collection: 'study', desc: 'APA, MLA, Chicago, Harvard citations' },
  { name: 'FlashForge', url: '/study/flashcards/', collection: 'study', desc: 'Flashcards with spaced repetition' },
  { name: 'GradeCalc', url: '/study/grades/', collection: 'study', desc: 'GPA, weighted grade, final exam calculator' },
  { name: 'BiasCheck', url: '/study/bias/', collection: 'study', desc: 'Media bias & loaded language analyser' },
  { name: 'ReadScore', url: '/write/readscore/', collection: 'write', desc: 'Flesch-Kincaid readability analysis' },
  { name: 'WordCount Pro', url: '/write/wordcount/', collection: 'write', desc: 'Word count, keyword density, live' },
  { name: 'LoremCraft', url: '/write/lorem/', collection: 'write', desc: 'Placeholder text in 10 styles' },
  { name: 'ThreadCraft', url: '/write/thread/', collection: 'write', desc: 'Split long text into a tweet thread' },
  { name: 'JSONLab', url: '/dev/json/', collection: 'dev', desc: 'Format, validate, minify, diff JSON' },
  { name: 'JSONConvert', url: '/dev/jsonconvert/', collection: 'dev', desc: 'JSON to YAML, CSV, XML, TOML' },
  { name: 'JWTStudio', url: '/dev/jwt/', collection: 'dev', desc: 'Decode & inspect JWT tokens' },
  { name: 'YAMLCheck', url: '/dev/yaml/', collection: 'dev', desc: 'YAML validator & formatter' },
  { name: 'CSVExplore', url: '/dev/csv/', collection: 'dev', desc: 'Sortable, filterable CSV viewer' },
  { name: 'MarkdownLive', url: '/dev/markdown/', collection: 'dev', desc: 'Markdown editor with live preview' },
  { name: 'HTMLPreview', url: '/dev/html/', collection: 'dev', desc: 'Sandboxed HTML renderer' },
  { name: 'SQLFormat', url: '/dev/sql/', collection: 'dev', desc: 'SQL formatter & beautifier' },
  { name: 'ColourContrast', url: '/dev/contrast/', collection: 'dev', desc: 'WCAG AA/AAA contrast checker' },
  { name: 'UUIDGen', url: '/dev/uuid/', collection: 'dev', desc: 'UUID v4/v7, ULID, nanoid generator' },
  { name: 'TimezoneNow', url: '/dev/timezone/', collection: 'dev', desc: 'World clock & meeting overlap finder' },
  { name: 'TZConvert', url: '/dev/timeconvert/', collection: 'dev', desc: 'Convert a date & time across timezones' },
  { name: 'RegexLab', url: '/dev/regex/', collection: 'dev', desc: 'Regex tester with match highlighting' },
  { name: 'CronLab', url: '/dev/cron/', collection: 'dev', desc: 'Cron expression workbench' },
  { name: 'Marketing tools', url: '/marketing/', collection: 'marketing', desc: 'UTM builder, headline scorer, ad copy, ROI calculator' },
  { name: 'UTMBuilder', url: '/marketing/utm/', collection: 'marketing', desc: 'Build UTM tracking links — history saved locally' },
  { name: 'HeadlineScore', url: '/marketing/headline/', collection: 'marketing', desc: 'Score headlines for clarity, emotion, and SEO' },
  { name: 'EmailSubjectTester', url: '/marketing/emailsubject/', collection: 'marketing', desc: 'Spam triggers, mobile preview, sentiment' },
  { name: 'AdCopyWriter', url: '/marketing/adcopy/', collection: 'marketing', desc: 'Google, Meta and LinkedIn ad copy from a brief' },
  { name: 'SocialCalendar', url: '/marketing/calendar/', collection: 'marketing', desc: 'Plan your content calendar — saved locally' },
  { name: 'PersonaBuilder', url: '/marketing/persona/', collection: 'marketing', desc: 'AI-assisted customer personas, saved locally' },
  { name: 'CompetitorMatrix', url: '/marketing/competitor/', collection: 'marketing', desc: 'Feature comparison matrix — export CSV or Markdown' },
  { name: 'ROICalculator', url: '/marketing/roi/', collection: 'marketing', desc: 'ROI, ROAS, CPA, CLV and payback period' },
  { name: 'Finance tools', url: '/finance/', collection: 'finance', desc: 'Compound interest, mortgage, tax, budget, and more' },
  { name: 'CompoundCalc', url: '/finance/compound/', collection: 'finance', desc: 'Compound interest with monthly contributions' },
  { name: 'BudgetPlanner', url: '/finance/budget/', collection: 'finance', desc: '50/30/20 budget split with a donut chart' },
  { name: 'MortgageCalc', url: '/finance/mortgage/', collection: 'finance', desc: 'EMI, amortisation schedule, overpayment savings' },
  { name: 'InvestmentTracker', url: '/finance/investments/', collection: 'finance', desc: 'Portfolio holdings, returns, and allocation' },
  { name: 'TaxEstimate', url: '/finance/tax/', collection: 'finance', desc: 'Income tax for India, US or UK' },
  { name: 'CurrencyConvert', url: '/finance/currency/', collection: 'finance', desc: '170+ currencies — rates cached daily' },
  { name: 'EquityCalc', url: '/finance/equity/', collection: 'finance', desc: 'Cap table dilution across funding rounds' },
  { name: 'NetWorthTracker', url: '/finance/networth/', collection: 'finance', desc: 'Assets minus liabilities, tracked monthly' },
  { name: 'LoanCalc', url: '/finance/loan/', collection: 'finance', desc: 'EMI, amortisation, and part-payment impact for any loan' },
  { name: 'RetireCalc', url: '/finance/retire/', collection: 'finance', desc: 'Retirement corpus needed vs on track — and the gap' },
  { name: 'InflationCalc', url: '/finance/inflation/', collection: 'finance', desc: 'What inflation does to your money over time' },
  { name: 'Base64Tool', url: '/dev/base64/', collection: 'dev', desc: 'Encode and decode Base64 live — standard or URL-safe' },
  { name: 'DiffCheck', url: '/dev/diff/', collection: 'dev', desc: 'Line-by-line text comparison, fully local' },
  { name: 'WSTester', url: '/dev/websocket/', collection: 'dev', desc: 'Connect and test WebSocket servers from your browser' },
  { name: 'CodePlay', url: '/dev/play/', collection: 'dev', desc: 'HTML/CSS/JS playground with live preview and console' },
  { name: 'BigOCheck', url: '/dev/bigo/', collection: 'dev', desc: 'Estimate time complexity from code structure' },
  { name: 'WorldClock', url: '/dev/worldclock/', collection: 'dev', desc: 'Airport-style analog world clocks, TV fullscreen' },
  { name: 'SketchPad', url: '/design/sketch/', collection: 'design', desc: 'Local whiteboard — pen, shapes, arrows, text, PNG export' },
  { name: 'PhotoTune', url: '/design/photo/', collection: 'design', desc: 'Local photo editor — filters, rotate, resize, export' },
  { name: 'UnitConvert', url: '/productivity/convert/', collection: 'productivity', desc: 'Every common unit converted live, with full tables' },
  { name: 'Legal tools', url: '/legal/', collection: 'legal', desc: 'Contract reader, NDA generator, privacy policy, terms' },
  { name: 'ContractRead', url: '/legal/contract/', collection: 'legal', desc: 'Plain-English contract summary — on-device AI' },
  { name: 'NDAGenerator', url: '/legal/nda/', collection: 'legal', desc: 'Mutual or one-way NDA from a template' },
  { name: 'PrivacyPolicyGen', url: '/legal/privacy-policy/', collection: 'legal', desc: 'GDPR/CCPA-aware privacy policy generator' },
  { name: 'TermsBuilder', url: '/legal/terms/', collection: 'legal', desc: 'Terms of Service from a template' },
  { name: 'CopyrightChecker', url: '/legal/copyright/', collection: 'legal', desc: 'Estimate public-domain status by jurisdiction' },
  { name: 'LegalGlossary', url: '/legal/glossary/', collection: 'legal', desc: '130+ legal terms explained in plain English' },
  { name: 'HR tools', url: '/hr/', collection: 'hr', desc: 'Salary bands, JD writer, interview kit, onboarding' },
  { name: 'SalaryBand', url: '/hr/salary/', collection: 'hr', desc: 'Pay grades, compa-ratio, range visualisation' },
  { name: 'JobDescriptionWriter', url: '/hr/jd/', collection: 'hr', desc: 'Inclusive job descriptions via on-device AI' },
  { name: 'InterviewKit', url: '/hr/interview/', collection: 'hr', desc: 'Role-specific questions and a scoring rubric' },
  { name: 'OfferLetterBuilder', url: '/hr/offer/', collection: 'hr', desc: 'Professional offer letter from a template' },
  { name: 'OnboardingChecklist', url: '/hr/onboarding/', collection: 'hr', desc: 'Day 1 / Week 1 / Month 1 checklist, saved locally' },
  { name: 'LeaveCalculator', url: '/hr/leave/', collection: 'hr', desc: 'Accrual, balance, and carry-forward' },
  { name: 'Health tools', url: '/health/', collection: 'health', desc: 'BMI, medication log, symptom diary, cycle, water, sleep' },
  { name: 'BMICalc', url: '/health/bmi/', collection: 'health', desc: 'BMI, BMR, TDEE and healthy weight range' },
  { name: 'MedicationLog', url: '/health/medication/', collection: 'health', desc: 'Medications, doses and adherence rate' },
  { name: 'SymptomDiary', url: '/health/symptoms/', collection: 'health', desc: 'Log symptoms and severity on a calendar' },
  { name: 'CycleTracker', url: '/health/cycle/', collection: 'health', desc: 'Predict next period and fertile window' },
  { name: 'WaterIntake', url: '/health/water/', collection: 'health', desc: 'One-tap hydration logging and streaks' },
  { name: 'SleepLog', url: '/health/sleep/', collection: 'health', desc: 'Sleep duration, quality and AI pattern analysis' },
  { name: 'Design tools', url: '/design/', collection: 'design', desc: 'Palette, type scale, icons, shadows, spacing, gradients' },
  { name: 'PaletteForge', url: '/design/palette/', collection: 'design', desc: 'Colour palettes with CSS/Tailwind export and contrast ratios' },
  { name: 'TypographyScale', url: '/design/typography/', collection: 'design', desc: 'A harmonious 9-step type scale from base size and ratio' },
  { name: 'IconExplorer', url: '/design/icons/', collection: 'design', desc: 'A curated outline icon set — copy as SVG, JSX, or Vue' },
  { name: 'ShadowStudio', url: '/design/shadows/', collection: 'design', desc: 'Layered CSS box shadows visually, with presets' },
  { name: 'SpacingCalc', url: '/design/spacing/', collection: 'design', desc: 'Linear or multiplicative spacing scale, with export' },
  { name: 'GradientMaker', url: '/design/gradient/', collection: 'design', desc: 'Linear, radial, and conic CSS gradients visually' },
  { name: 'Productivity tools', url: '/productivity/', collection: 'productivity', desc: 'Focus timer, notes, decision matrix, meeting cost, habits, reading list' },
  { name: 'FocusTimer', url: '/productivity/focus/', collection: 'productivity', desc: 'Pomodoro-style focus sessions with notifications' },
  { name: 'QuickNote', url: '/productivity/note/', collection: 'productivity', desc: 'A fast, private notepad that autosaves as you type' },
  { name: 'DecisionMatrix', url: '/productivity/decision/', collection: 'productivity', desc: 'Weigh criteria, rate options, see which wins' },
  { name: 'MeetingTimer', url: '/productivity/meeting-timer/', collection: 'productivity', desc: 'See the real cost of your meeting, live' },
  { name: 'HabitTracker', url: '/productivity/habits/', collection: 'productivity', desc: 'Daily habits with streaks and a heatmap' },
  { name: 'ReadingList', url: '/productivity/reading/', collection: 'productivity', desc: 'Save articles and books, track status and notes' },
  { name: 'Chrome AI tools', url: '/ai/', collection: 'ai', desc: 'On-device AI — summarize and translate, Chrome-only' },
  { name: 'AISummarize', url: '/ai/summarize/', collection: 'ai', desc: 'Summarize long text on-device — TL;DR, key points, headline' },
  { name: 'AITranslate', url: '/ai/translate/', collection: 'ai', desc: 'Translate between languages on-device with auto-detection' },
  { name: 'Privacy Policy', url: '/privacy.html', collection: 'tools', desc: "What tapdot tools does — and doesn't — collect" },
];

function initSearch() {
  const nav = document.querySelector('.ts-nav');
  if (!nav || document.querySelector('.ts-search-trigger')) return;
  const toggle = document.getElementById('darkToggle');

  const trigger = document.createElement('button');
  trigger.className = 'ts-search-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Search tools');
  trigger.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
    '<span class="label">Search tools…</span><span class="ts-search-kbd">Ctrl K</span>';
  if (toggle) toggle.before(trigger); else nav.appendChild(trigger);

  const GROUP_ORDER = {
    tools: 0, study: 1, write: 2, dev: 3, marketing: 4, finance: 5,
    legal: 6, hr: 7, health: 8, design: 9, productivity: 10, ai: 11,
  };
  const GROUP_LABELS = {
    tools: 'Tools', study: 'Study', write: 'Write', dev: 'Dev', marketing: 'Marketing',
    finance: 'Finance', legal: 'Legal', hr: 'HR', health: 'Health', design: 'Design',
    productivity: 'Productivity', ai: 'Chrome AI',
  };
  let backdrop = null, activeIdx = 0, filtered = [];

  // Grouped by collection (each group keeps its own pastel colour), sorted
  // by relevance within a group.
  function results(query) {
    const q = query.trim().toLowerCase();
    const scored = TOOL_REGISTRY.map(item => {
      if (!q) return { item, score: 1 };
      const name = item.name.toLowerCase();
      let score = -1;
      if (name.startsWith(q)) score = 3;
      else if (name.includes(q)) score = 2;
      else if (item.desc.toLowerCase().includes(q) || item.collection.includes(q)) score = 1;
      return { item, score };
    }).filter(r => r.score > 0);
    scored.sort((a, b) => ((GROUP_ORDER[a.item.collection] ?? 99) - (GROUP_ORDER[b.item.collection] ?? 99)) || (b.score - a.score));
    return scored.map(r => r.item);
  }

  function iconFor(item) {
    return ICONS[item.name] || ICONS[item.collection] || ICONS.tools;
  }

  function renderResults() {
    const list = document.getElementById('tsPaletteResults');
    if (!filtered.length) { list.innerHTML = '<div class="ts-palette-empty">No tools match that search.</div>'; return; }
    let html = '', lastCol = null;
    filtered.forEach((item, i) => {
      if (item.collection !== lastCol) {
        html += `<div class="ts-palette-group" data-collection="${item.collection}">${GROUP_LABELS[item.collection] || item.collection}</div>`;
        lastCol = item.collection;
      }
      html += `<a class="ts-palette-item${i === activeIdx ? ' active' : ''}" href="${item.url}" data-i="${i}" data-collection="${item.collection}">
         <span class="pi-icon" aria-hidden="true">${iconFor(item)}</span>
         <span class="pi-text"><span class="pi-name">${escapeHtml(item.name)}</span><span class="pi-desc">${escapeHtml(item.desc)}</span></span>
       </a>`;
    });
    list.innerHTML = html;
    const activeEl = list.querySelector('.ts-palette-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'ts-palette-backdrop';
    backdrop.innerHTML =
      '<div class="ts-palette" role="dialog" aria-modal="true" aria-label="Search tools">' +
        '<div class="ts-palette-input-row">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input id="tsPaletteInput" placeholder="Search tools…" autocomplete="off" spellcheck="false" />' +
        '</div>' +
        '<div class="ts-palette-results" id="tsPaletteResults"></div>' +
        '<div class="ts-palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>' +
      '</div>';
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    filtered = results(''); activeIdx = 0; renderResults();
    const input = document.getElementById('tsPaletteInput');
    input.focus();

    input.addEventListener('input', () => { filtered = results(input.value); activeIdx = 0; renderResults(); });
    document.getElementById('tsPaletteResults').addEventListener('click', (e) => {
      const a = e.target.closest('.ts-palette-item'); if (a) close();
    });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!backdrop) return;
    document.removeEventListener('keydown', onKey);
    backdrop.remove(); backdrop = null;
    document.body.style.overflow = '';
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, filtered.length - 1); renderResults(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); renderResults(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) window.location.href = item.url;
    }
  }

  trigger.addEventListener('click', open);
  // Any on-page element (e.g. the homepage hero search bar) can open the palette:
  document.querySelectorAll('[data-open-search]').forEach(el => el.addEventListener('click', open));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); backdrop ? close() : open(); }
  });
}

// ── Futuristic background ────────────────────────────────────────────────────

function initBackground() {
  if (document.querySelector('.ts-bg')) return;
  const bg = document.createElement('div');
  bg.className = 'ts-bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML =
    '<div class="ts-bg-grid"></div>' +
    '<div class="ts-bg-orb o1"></div>' +
    '<div class="ts-bg-orb o2"></div>' +
    '<div class="ts-bg-orb o3"></div>';
  document.body.appendChild(bg);
  initParallax(bg);
}

function initParallax(bg) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const orbs = [...bg.querySelectorAll('.ts-bg-orb')];
  const depths = [0.020, -0.028, 0.016];
  const scrollDepths = [0.06, -0.04, 0.08];
  const drift = [
    { x: 26, y: 20, s: 0.00021 },
    { x: -30, y: 24, s: 0.00017 },
    { x: 22, y: -26, s: 0.00025 },
  ];
  let tx = 0, ty = 0, mx = 0, my = 0;
  const cx = () => window.innerWidth / 2, cy = () => window.innerHeight / 2;
  window.addEventListener('mousemove', (e) => { tx = e.clientX - cx(); ty = e.clientY - cy(); }, { passive: true });
  function frame(t) {
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    const sy = window.scrollY || 0;
    orbs.forEach((orb, i) => {
      const dr = drift[i];
      const dx = Math.sin(t * dr.s) * dr.x + mx * depths[i];
      const dy = Math.cos(t * dr.s * 1.1) * dr.y + my * depths[i] + sy * scrollDepths[i];
      orb.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Breadcrumb nav (tapdot / Tools / <Category> / <Tool>) + back button ──────

const COLLECTION_LABELS = {
  study: 'Study', write: 'Write', dev: 'Dev',
  marketing: 'Marketing', finance: 'Finance', legal: 'Legal', hr: 'HR',
  health: 'Health', design: 'Design', productivity: 'Productivity', ai: 'Chrome AI',
};

function collectionHome() {
  const col = document.documentElement.dataset.collection || 'tools';
  return col in COLLECTION_LABELS ? '/' + col + '/' : '/';
}

// Where the on-page back arrow goes: tool -> its collection hub; collection
// hub -> root; root -> nowhere (button hidden).
function parentUrl() {
  const col = document.documentElement.dataset.collection || 'tools';
  const tool = document.documentElement.dataset.tool || '';
  if (tool) return collectionHome();
  if (col in COLLECTION_LABELS) return '/';
  return null;
}

function initBackButton() {
  const nav = document.querySelector('.ts-nav');
  if (!nav || document.querySelector('.ts-back-btn')) return;
  const parent = parentUrl();
  if (!parent) return;
  const a = document.createElement('a');
  a.className = 'ts-back-btn';
  a.href = parent;
  a.setAttribute('aria-label', 'Back');
  a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  nav.insertBefore(a, nav.firstChild);
}

function initBreadcrumb() {
  const nav = document.querySelector('.ts-nav');
  if (!nav) return;
  const logo = nav.querySelector('.ts-nav-logo');
  const toggle = document.getElementById('darkToggle');
  if (!logo) return;

  let node = logo.nextSibling;
  while (node && node !== toggle) {
    const next = node.nextSibling;
    if (node.nodeType === 1 &&
        (node.classList.contains('ts-nav-divider') ||
         node.classList.contains('ts-nav-tool') ||
         node.classList.contains('ts-nav-crumb'))) {
      node.remove();
    }
    node = next;
  }

  const col = document.documentElement.dataset.collection || 'tools';
  const tool = document.documentElement.dataset.tool || '';
  const crumbs = [{ label: 'Tools', href: '/' }];
  if (col in COLLECTION_LABELS) crumbs.push({ label: COLLECTION_LABELS[col], href: collectionHome() });
  if (tool) crumbs.push({ label: tool, href: null });

  const frag = document.createDocumentFragment();
  crumbs.forEach((c, i) => {
    const div = document.createElement('span');
    div.className = 'ts-nav-divider'; div.textContent = '/';
    frag.appendChild(div);
    const first = i === 0, last = i === crumbs.length - 1;
    if (c.href && !last) {
      const a = document.createElement('a');
      // Only the FIRST crumb ("Tools", the way home) stays visible when the
      // nav is tight on mobile; any crumb strictly between first and last
      // collapses there instead.
      a.className = 'ts-nav-crumb' + (first ? ' ts-nav-crumb-home' : ' ts-nav-crumb-mid');
      a.href = c.href; a.textContent = c.label;
      frag.appendChild(a);
    } else {
      const s = document.createElement('span');
      s.className = 'ts-nav-tool'; s.textContent = c.label;
      frag.appendChild(s);
    }
  });
  logo.after(frag);
}

// ── Tool icon beside the page title ─────────────────────────────────────────

function initToolIcon() {
  const tool = document.documentElement.dataset.tool || '';
  const icon = ICONS[tool];
  const h1 = document.querySelector('.ts-tool-header .ts-tool-name');
  if (!icon || !h1 || h1.parentElement.classList.contains('ts-tool-head-row')) return;
  const row = document.createElement('div');
  row.className = 'ts-tool-head-row';
  const span = document.createElement('span');
  span.className = 'ts-tool-icon'; span.setAttribute('aria-hidden', 'true');
  span.innerHTML = icon;
  h1.replaceWith(row);
  row.appendChild(span);
  row.appendChild(h1);
}

// ── How it works — bottom walkthrough (unique demos, played step by step) ────
// To add a tool: add STEPS['ToolName'] = [ {t, d:{k, ...}}, ...3 ]. See CLAUDE.md.

const STEPS = {
  'CiteMaker': [
    { t: 'Pick a style', d: { k: 'chips', items: ['APA', 'MLA', 'Chicago', 'Harvard'], on: 0 } },
    { t: 'Add the source', d: { k: 'fields', rows: [['Author', 'Smith, J.'], ['Title', 'Deep Work'], ['Year', '2026']] } },
    { t: 'Copy the citation', d: { k: 'result', text: 'Smith, J. (2026). Deep Work.' } },
  ],
  'FlashForge': [
    { t: 'Paste or import notes', d: { k: 'text', text: 'Mitochondria - the powerhouse' } },
    { t: 'Cards generate', d: { k: 'flip', front: 'What is the mitochondria?', back: 'The powerhouse of the cell' } },
    { t: 'Study & rate', d: { k: 'rate' } },
  ],
  'GradeCalc': [
    { t: 'Enter courses', d: { k: 'rows', rows: [['Biology', 'A', '3 cr']] } },
    { t: 'Add more grades', d: { k: 'rows', rows: [['Biology', 'A', '3 cr'], ['Math', 'B+', '4 cr']] } },
    { t: 'See your GPA', d: { k: 'count', to: 3.85, label: 'GPA' } },
  ],
  'BiasCheck': [
    { t: 'Paste an excerpt', d: { k: 'text', text: 'The alarming crisis shocked many.' } },
    { t: 'AI reads patterns', d: { k: 'hl', text: 'The alarming crisis shocked many.', marks: ['alarming', 'crisis', 'shocked'] } },
    { t: 'See the analysis', d: { k: 'chips', items: ['alarming', 'crisis', 'shocked'] } },
  ],
  'ReadScore': [
    { t: 'Paste your writing', d: { k: 'text', text: 'It was a bright cold day in April.' } },
    { t: 'Press Analyse', d: { k: 'scan', text: 'It was a bright cold day in April.' } },
    { t: 'Read your score', d: { k: 'count', to: 8.2, label: 'Grade level' } },
  ],
  'WordCount Pro': [
    { t: 'Type or paste', d: { k: 'text', text: 'The quick brown fox jumps.' } },
    { t: 'Counts update live', d: { k: 'stats', items: [['128', 'words'], ['642', 'chars']] } },
    { t: 'Keyword density', d: { k: 'table', rows: [['fox', '3.1%'], ['quick', '2.4%']] } },
  ],
  'LoremCraft': [
    { t: 'Pick style & amount', d: { k: 'chips', items: ['Startup', '3 paragraphs'], on: 0 } },
    { t: 'Choose a format', d: { k: 'chips', items: ['Plain', 'HTML', 'Markdown'], on: 1 } },
    { t: 'Generate & copy', d: { k: 'text', text: 'Lorem ipsum dolor sit amet.' } },
  ],
  'ThreadCraft': [
    { t: 'Paste long text', d: { k: 'text', text: 'A long post worth splitting.' } },
    { t: 'Set limit & numbers', d: { k: 'chips', items: ['280 chars', '1/n'], on: 0 } },
    { t: 'Copy your thread', d: { k: 'tweets', items: ['1/3  Intro to...', '2/3  The key...', '3/3  In short...'] } },
  ],
  'JSONLab': [
    { t: 'Paste JSON', d: { k: 'text', text: '{"user":"jo","ok":true}' } },
    { t: 'Format & validate', d: { k: 'result', text: '{ "user": "jo" }' } },
    { t: 'Copy, minify or diff', d: { k: 'chips', items: ['Format', 'Minify', 'Diff'], on: 0 } },
  ],
  'JSONConvert': [
    { t: 'Paste JSON', d: { k: 'text', text: '{"port":8080}' } },
    { t: 'Choose a target', d: { k: 'chips', items: ['YAML', 'CSV', 'XML'], on: 0 } },
    { t: 'Get the result', d: { k: 'result', text: 'port: 8080' } },
  ],
  'JWTStudio': [
    { t: 'Paste your token', d: { k: 'text', text: 'eyJhbGciOiJIUzI1Ni...' } },
    { t: 'Decoded locally', d: { k: 'rows', rows: [['alg', 'HS256'], ['sub', '1234']] } },
    { t: 'Check expiry', d: { k: 'chips', items: ['Valid'], on: 0 } },
  ],
  'YAMLCheck': [
    { t: 'Paste YAML', d: { k: 'text', text: 'name: build' } },
    { t: 'Validate', d: { k: 'chips', items: ['Valid ✓'], on: 0 } },
    { t: 'Format & copy', d: { k: 'result', text: 'name: build' } },
  ],
  'CSVExplore': [
    { t: 'Paste CSV', d: { k: 'text', text: 'name,age,city' } },
    { t: 'Instant table', d: { k: 'table', rows: [['name', 'age'], ['Jo', '29']] } },
    { t: 'Sort & filter', d: { k: 'chips', items: ['Sort', 'Filter'], on: 0 } },
  ],
  'MarkdownLive': [
    { t: 'Type Markdown', d: { k: 'text', text: '# Hello **world**' } },
    { t: 'Live preview', d: { k: 'result', text: 'Hello world' } },
    { t: 'Autosaves locally', d: { k: 'chips', items: ['.md', 'HTML'], on: 0 } },
  ],
  'HTMLPreview': [
    { t: 'Paste HTML', d: { k: 'text', text: '<h1>Hi</h1>' } },
    { t: 'Sandboxed render', d: { k: 'result', text: 'Hi' } },
    { t: 'Desktop / mobile', d: { k: 'chips', items: ['Desktop', 'Tablet', 'Mobile'], on: 0 } },
  ],
  'SQLFormat': [
    { t: 'Paste a query', d: { k: 'text', text: 'select * from users' } },
    { t: 'Format it', d: { k: 'result', text: 'SELECT * FROM users' } },
    { t: 'Copy clean SQL', d: { k: 'chips', items: ['UPPER', 'lower'], on: 0 } },
  ],
  'ColourContrast': [
    { t: 'Pick two colours', d: { k: 'chips', items: ['#0F0F1A', '#FFFFFF'], on: 0 } },
    { t: 'See the ratio', d: { k: 'count', to: 16.1, label: 'contrast' } },
    { t: 'AA / AAA check', d: { k: 'chips', items: ['AA ✓', 'AAA ✓'], on: 0 } },
  ],
  'UUIDGen': [
    { t: 'Pick a format', d: { k: 'chips', items: ['v4', 'v7', 'ULID', 'nanoid'], on: 0 } },
    { t: 'Generate locally', d: { k: 'text', text: '9f1c2a7e-4b3d-...' } },
    { t: 'Copy or download', d: { k: 'count', to: 100, label: 'at once' } },
  ],
  'TimezoneNow': [
    { t: 'Click cities on the map', d: { k: 'chips', items: ['NYC', 'London', 'Tokyo'], on: 0 } },
    { t: 'Live clocks', d: { k: 'rows', rows: [['London', '14:30'], ['Tokyo', '22:30']] } },
    { t: 'Find overlap', d: { k: 'chips', items: ['9-6 overlap'], on: 0 } },
  ],
  'TZConvert': [
    { t: 'Pick a date & time', d: { k: 'text', text: 'Jul 4, 2026 · 09:00' } },
    { t: 'Drag the slider or map', d: { k: 'chips', items: ['NYC', 'London', 'Tokyo'], on: 1 } },
    { t: 'See every conversion', d: { k: 'rows', rows: [['London', '14:00'], ['Tokyo', '22:00']] } },
  ],
  'RegexLab': [
    { t: 'Write a pattern', d: { k: 'text', text: '[a-z]+\\d+' } },
    { t: 'Live matches', d: { k: 'hl', text: 'abc12 xy99 zz', marks: ['abc12', 'xy99'] } },
    { t: 'Groups & replace', d: { k: 'chips', items: ['2 matches'], on: 0 } },
  ],
  'CronLab': [
    { t: 'Enter an expression', d: { k: 'text', text: '0 9 * * 1-5' } },
    { t: 'Plain English', d: { k: 'result', text: 'Weekdays at 09:00' } },
    { t: 'Next 20 runs', d: { k: 'rows', rows: [['Mon', '09:00'], ['Tue', '09:00']] } },
  ],
  'UTMBuilder': [
    { t: 'Paste your URL', d: { k: 'text', text: 'example.com/landing' } },
    { t: 'Add source & campaign', d: { k: 'fields', rows: [['Source', 'newsletter'], ['Campaign', 'q3_launch']] } },
    { t: 'Copy the tagged link', d: { k: 'result', text: '?utm_source=newsletter' } },
  ],
  'HeadlineScore': [
    { t: 'Paste a headline', d: { k: 'text', text: '7 Proven Ways to Focus' } },
    { t: 'See your score', d: { k: 'count', to: 82, label: 'score / 100' } },
    { t: 'Get AI alternatives', d: { k: 'chips', items: ['Clarity ✓', 'Emotion ✓'], on: 0 } },
  ],
  'EmailSubjectTester': [
    { t: 'Paste a subject line', d: { k: 'text', text: 'Your order ships today' } },
    { t: 'Check spam triggers', d: { k: 'chips', items: ['0 triggers'], on: 0 } },
    { t: 'Preview & AI variants', d: { k: 'stats', items: [['38', 'chars'], ['0', 'emoji']] } },
  ],
  'AdCopyWriter': [
    { t: 'Fill in your brief', d: { k: 'fields', rows: [['Product', 'tapdot Tools'], ['Tone', 'Friendly']] } },
    { t: 'Pick a platform', d: { k: 'chips', items: ['Google', 'Meta', 'LinkedIn'], on: 0 } },
    { t: 'Get 3 variants', d: { k: 'result', text: 'Headline: Free & Private Tools' } },
  ],
  'SocialCalendar': [
    { t: 'Click a day', d: { k: 'chips', items: ['Jul 15'], on: 0 } },
    { t: 'Add platform & copy', d: { k: 'fields', rows: [['Platform', 'Instagram'], ['Status', 'Draft']] } },
    { t: 'Plan your month', d: { k: 'rows', rows: [['Jul 15', 'Instagram'], ['Jul 18', 'LinkedIn']] } },
  ],
  'PersonaBuilder': [
    { t: 'Describe your segment', d: { k: 'fields', rows: [['Segment', 'freelance designers'], ['Pains', 'missed deadlines']] } },
    { t: 'AI builds the persona', d: { k: 'text', text: 'Maya, 29, Freelance Designer' } },
    { t: 'Save & reuse it', d: { k: 'chips', items: ['Saved ✓'], on: 0 } },
  ],
  'CompetitorMatrix': [
    { t: 'Add competitors', d: { k: 'chips', items: ['Us', 'Competitor A'], on: 0 } },
    { t: 'Rate each feature', d: { k: 'rows', rows: [['API access', 'Yes'], ['Free tier', 'Partial']] } },
    { t: 'Export the matrix', d: { k: 'chips', items: ['CSV', 'Markdown'], on: 0 } },
  ],
  'ROICalculator': [
    { t: 'Enter spend & revenue', d: { k: 'fields', rows: [['Spend', '$1,000'], ['Revenue', '$3,000']] } },
    { t: 'See ROI & ROAS', d: { k: 'count', to: 200, label: '% ROI' } },
    { t: 'Compare campaigns', d: { k: 'table', rows: [['Campaign A', '200%'], ['Campaign B', '140%']] } },
  ],
  'CompoundCalc': [
    { t: 'Enter principal & rate', d: { k: 'fields', rows: [['Principal', '$10,000'], ['Rate', '7%']] } },
    { t: 'Add contributions', d: { k: 'fields', rows: [['Monthly', '$200'], ['Years', '20']] } },
    { t: 'See the growth', d: { k: 'count', to: 108000, label: 'final value' } },
  ],
  'BudgetPlanner': [
    { t: 'Enter your income', d: { k: 'text', text: '$5,000 / month' } },
    { t: 'Add expense categories', d: { k: 'rows', rows: [['Rent', '$1,500'], ['Dining', '$250']] } },
    { t: 'See your 50/30/20 split', d: { k: 'chips', items: ['Needs 45%', 'Wants 15%'], on: 0 } },
  ],
  'MortgageCalc': [
    { t: 'Enter loan & rate', d: { k: 'fields', rows: [['Loan', '$300,000'], ['Rate', '6.5%']] } },
    { t: 'See your EMI', d: { k: 'count', to: 1517, label: 'monthly EMI' } },
    { t: 'Try an overpayment', d: { k: 'chips', items: ['4.2 yrs saved'], on: 0 } },
  ],
  'InvestmentTracker': [
    { t: 'Add a holding', d: { k: 'fields', rows: [['Name', 'Index Fund'], ['Qty', '20']] } },
    { t: 'Enter current price', d: { k: 'text', text: '$120 / share' } },
    { t: 'Track gain & allocation', d: { k: 'count', to: 400, label: '$ gain' } },
  ],
  'TaxEstimate': [
    { t: 'Pick your country', d: { k: 'chips', items: ['India', 'US', 'UK'], on: 0 } },
    { t: 'Enter income', d: { k: 'text', text: '$1,200,000 / year' } },
    { t: 'See estimated tax', d: { k: 'count', to: 18, label: '% effective rate' } },
  ],
  'CurrencyConvert': [
    { t: 'Enter an amount', d: { k: 'text', text: '100 USD' } },
    { t: 'Pick currencies', d: { k: 'chips', items: ['USD', 'EUR'], on: 0 } },
    { t: 'See the conversion', d: { k: 'result', text: '92.40 EUR' } },
  ],
  'EquityCalc': [
    { t: 'Enter existing shares', d: { k: 'fields', rows: [['Shares', '8,000,000'], ['Option pool', '1,000,000']] } },
    { t: 'Enter the round', d: { k: 'fields', rows: [['Investment', '$2M'], ['Pre-money', '$8M']] } },
    { t: 'See the dilution', d: { k: 'count', to: 25, label: '% diluted' } },
  ],
  'NetWorthTracker': [
    { t: 'List your assets', d: { k: 'rows', rows: [['Cash', '$5,000'], ['Investments', '$20,000']] } },
    { t: 'List your liabilities', d: { k: 'rows', rows: [['Credit card', '$1,500']] } },
    { t: 'Track your trend', d: { k: 'count', to: 23500, label: 'net worth' } },
  ],
  'ContractRead': [
    { t: 'Paste the contract', d: { k: 'text', text: 'This Agreement is entered into...' } },
    { t: 'AI reads it', d: { k: 'chips', items: ['Obligations', 'Payment terms'], on: 0 } },
    { t: 'Get a plain summary', d: { k: 'result', text: 'You must pay within 30 days.' } },
  ],
  'NDAGenerator': [
    { t: 'Pick mutual or one-way', d: { k: 'chips', items: ['Mutual', 'One-way'], on: 0 } },
    { t: 'Fill in the parties', d: { k: 'fields', rows: [['Party A', 'Acme Inc.'], ['Duration', '2 yrs']] } },
    { t: 'Download the NDA', d: { k: 'result', text: 'NON-DISCLOSURE AGREEMENT' } },
  ],
  'PrivacyPolicyGen': [
    { t: 'Describe your data use', d: { k: 'chips', items: ['Email', 'Analytics'], on: 0 } },
    { t: 'Add cookies & vendors', d: { k: 'fields', rows: [['Cookies', 'Yes'], ['Vendors', 'Stripe']] } },
    { t: 'Get a GDPR-aware policy', d: { k: 'result', text: 'PRIVACY POLICY' } },
  ],
  'TermsBuilder': [
    { t: 'Enter your product', d: { k: 'fields', rows: [['Company', 'tapdot'], ['Min age', '13']] } },
    { t: 'Set jurisdiction', d: { k: 'text', text: 'State of Delaware' } },
    { t: 'Get your Terms', d: { k: 'result', text: 'TERMS OF SERVICE' } },
  ],
  'CopyrightChecker': [
    { t: 'Pick a jurisdiction', d: { k: 'chips', items: ['US', 'UK', 'EU', 'India'], on: 0 } },
    { t: 'Enter the dates', d: { k: 'fields', rows: [['Published', '1965'], ['Author died', '1980']] } },
    { t: 'See the status', d: { k: 'chips', items: ['Public domain ✓'], on: 0 } },
  ],
  'LegalGlossary': [
    { t: 'Search a term', d: { k: 'text', text: 'indemnify' } },
    { t: 'Read it in plain English', d: { k: 'result', text: 'Compensate for loss or damage' } },
    { t: 'Share a direct link', d: { k: 'chips', items: ['#indemnification'], on: 0 } },
  ],
  'SalaryBand': [
    { t: 'Set your pay grades', d: { k: 'fields', rows: [['L1', '$60k–$90k'], ['L2', '$80k–$120k']] } },
    { t: 'Add roles', d: { k: 'fields', rows: [['Engineer I', '$68,000']] } },
    { t: 'See the compa-ratio', d: { k: 'count', to: 91, label: '% of midpoint' } },
  ],
  'JobDescriptionWriter': [
    { t: 'Describe the role', d: { k: 'fields', rows: [['Title', 'PMM'], ['Team', 'Growth']] } },
    { t: 'AI writes the JD', d: { k: 'result', text: 'We\'re looking for a...' } },
    { t: 'Checks for bias', d: { k: 'chips', items: ['0 flags found'], on: 0 } },
  ],
  'InterviewKit': [
    { t: 'Enter the role', d: { k: 'fields', rows: [['Role', 'Backend Eng'], ['Skills', 'distributed systems']] } },
    { t: 'AI writes questions', d: { k: 'chips', items: ['Technical', 'Behavioural'], on: 0 } },
    { t: 'Get a scoring rubric', d: { k: 'rows', rows: [['1', 'Below bar'], ['5', 'Exceeds bar']] } },
  ],
  'OfferLetterBuilder': [
    { t: 'Fill in the offer', d: { k: 'fields', rows: [['Candidate', 'Jordan Lee'], ['Salary', '$140,000']] } },
    { t: 'Set the start date', d: { k: 'text', text: 'Aug 4, 2026' } },
    { t: 'Download the letter', d: { k: 'result', text: 'Dear Jordan,' } },
  ],
  'OnboardingChecklist': [
    { t: 'Start from the default', d: { k: 'chips', items: ['Day 1', 'Week 1', 'Month 1'], on: 0 } },
    { t: 'Customise & assign owners', d: { k: 'rows', rows: [['IT setup', 'Sam'], ['Handbook', 'Jo']] } },
    { t: 'Track completion', d: { k: 'count', to: 62, label: '% complete' } },
  ],
  'LeaveCalculator': [
    { t: 'Set the policy', d: { k: 'fields', rows: [['Entitlement', '20 days'], ['Carry limit', '5 days']] } },
    { t: 'Enter leave taken', d: { k: 'text', text: '4 days taken' } },
    { t: 'See the balance', d: { k: 'count', to: 16, label: 'days available' } },
  ],
  'BMICalc': [
    { t: 'Enter your measurements', d: { k: 'fields', rows: [['Weight', '70 kg'], ['Height', '175 cm']] } },
    { t: 'Instant BMI', d: { k: 'count', to: 22.9, label: 'BMI · Normal weight' } },
    { t: 'See BMR & TDEE', d: { k: 'stats', items: [['1,687', 'BMR cal/day'], ['2,614', 'TDEE cal/day']] } },
  ],
  'MedicationLog': [
    { t: 'Add a medication', d: { k: 'fields', rows: [['Medication', 'Metformin 500mg'], ['Times/day', '2']] } },
    { t: 'Mark doses taken', d: { k: 'chips', items: ['Dose 1 ✓', 'Dose 2 ✓'], on: 0 } },
    { t: 'Track adherence', d: { k: 'count', to: 94, label: '7-day adherence %' } },
  ],
  'SymptomDiary': [
    { t: 'Log a symptom', d: { k: 'fields', rows: [['Symptom', 'Headache'], ['Severity', '3/5']] } },
    { t: 'See it on the calendar', d: { k: 'table', rows: [['Jun 2', 'Headache'], ['Jun 5', 'Fatigue']] } },
    { t: 'Get an AI summary', d: { k: 'result', text: 'Headaches cluster on weekday mornings' } },
  ],
  'CycleTracker': [
    { t: 'Log your last period', d: { k: 'fields', rows: [['Last period', 'Jun 3'], ['Cycle length', '28 days']] } },
    { t: 'Predicts your next one', d: { k: 'text', text: 'Predicted next: Jul 1' } },
    { t: 'See your fertile window', d: { k: 'stats', items: [['Jun 17–23', 'Fertile window'], ['Jun 20', 'Ovulation']] } },
  ],
  'WaterIntake': [
    { t: 'Tap to log', d: { k: 'chips', items: ['+250ml', '+500ml'], on: 1 } },
    { t: 'Watch the ring fill', d: { k: 'count', to: 1750, label: 'ml of 2,500 goal' } },
    { t: 'Build a streak', d: { k: 'stats', items: [['70%', 'of daily goal'], ['5', 'day streak']] } },
  ],
  'SleepLog': [
    { t: 'Log bed & wake time', d: { k: 'fields', rows: [['Bedtime', '11:00 PM'], ['Wake time', '7:00 AM']] } },
    { t: 'See your duration', d: { k: 'count', to: 8, label: 'hours of sleep' } },
    { t: 'AI spots the pattern', d: { k: 'result', text: 'Bedtime consistency: High' } },
  ],
  'Base64Tool': [
    { t: 'Paste anything', d: { k: 'text', text: 'Hello, world!' } },
    { t: 'Encoded instantly', d: { k: 'result', text: 'SGVsbG8sIHdvcmxkIQ==' } },
    { t: 'Or decode the other way', d: { k: 'chips', items: ['Encode', 'Decode'], on: 1 } },
  ],
  'DiffCheck': [
    { t: 'Paste both versions', d: { k: 'fields', rows: [['Original', 'v1 text'], ['Changed', 'v2 text']] } },
    { t: 'See every changed line', d: { k: 'rows', rows: [['+ added line', ''], ['− removed line', '']] } },
    { t: 'Get the counts', d: { k: 'result', text: '+4 −2' } },
  ],
  'WSTester': [
    { t: 'Connect to a server', d: { k: 'text', text: 'wss://echo.websocket.org' } },
    { t: 'Send a message', d: { k: 'result', text: '{"ping": true}' } },
    { t: 'Watch replies live', d: { k: 'rows', rows: [['▲ sent', '12:00:01'], ['▼ received', '12:00:01']] } },
  ],
  'CodePlay': [
    { t: 'Write HTML, CSS, JS', d: { k: 'chips', items: ['HTML', 'CSS', 'JS'], on: 2 } },
    { t: 'Preview updates live', d: { k: 'result', text: 'Clicked 3 times' } },
    { t: 'Console captured too', d: { k: 'text', text: 'count is now 3' } },
  ],
  'BigOCheck': [
    { t: 'Paste your function', d: { k: 'text', text: 'for i… for j…' } },
    { t: 'Structure analyzed', d: { k: 'result', text: 'O(n²)' } },
    { t: 'See exactly why', d: { k: 'text', text: 'Two nested loops over the input' } },
  ],
  'WorldClock': [
    { t: 'Add your cities', d: { k: 'chips', items: ['New York', 'London', 'Tokyo'], on: 1 } },
    { t: 'Pick a theme', d: { k: 'chips', items: ['Airport', 'Classic', 'Minimal'], on: 0 } },
    { t: 'Fullscreen for the TV', d: { k: 'result', text: '⛶ four clocks, wall-display size' } },
  ],
  'SketchPad': [
    { t: 'Pick a tool', d: { k: 'chips', items: ['✏️ Pen', '▭ Rect', '→ Arrow'], on: 2 } },
    { t: 'Draw your diagram', d: { k: 'scan', text: 'boxes → arrows → labels' } },
    { t: 'Export as PNG', d: { k: 'result', text: 'sketch.png saved locally' } },
  ],
  'PhotoTune': [
    { t: 'Open a photo', d: { k: 'text', text: 'IMG_2041.jpg — stays on device' } },
    { t: 'Tune the sliders', d: { k: 'fields', rows: [['Brightness', '112%'], ['Contrast', '108%']] } },
    { t: 'Download the result', d: { k: 'result', text: 'phototune.jpg exported' } },
  ],
  'UnitConvert': [
    { t: 'Pick a category', d: { k: 'chips', items: ['Length', 'Weight', 'Data'], on: 0 } },
    { t: 'Type an amount', d: { k: 'text', text: '100 cm' } },
    { t: 'Every equivalent at once', d: { k: 'stats', items: [['1', 'm'], ['39.37', 'in']] } },
  ],
  'AISummarize': [
    { t: 'Paste a long text', d: { k: 'text', text: '2,400-word article…' } },
    { t: 'Pick a style', d: { k: 'chips', items: ['TL;DR', 'Key points', 'Headline'], on: 1 } },
    { t: 'Summarized on-device', d: { k: 'result', text: '• Three key takeaways…' } },
  ],
  'AITranslate': [
    { t: 'Type in any language', d: { k: 'text', text: 'Bonjour, comment ça va ?' } },
    { t: 'Language auto-detected', d: { k: 'chips', items: ['Detected: French'], on: 0 } },
    { t: 'Translated locally', d: { k: 'result', text: 'Hello, how are you?' } },
  ],
  'LoanCalc': [
    { t: 'Enter your loan', d: { k: 'fields', rows: [['Amount', '$500,000'], ['Rate', '8.5%']] } },
    { t: 'Add part payments', d: { k: 'fields', rows: [['Month 24', '$20,000']] } },
    { t: 'See the impact', d: { k: 'stats', items: [['$74k', 'interest saved'], ['3.2y', 'earlier payoff']] } },
  ],
  'RetireCalc': [
    { t: 'Describe your plan', d: { k: 'fields', rows: [['Retire at', '60'], ['Expenses', '$4,000/mo']] } },
    { t: 'See what you need', d: { k: 'count', to: 2.4, label: 'million needed' } },
    { t: 'Close the gap', d: { k: 'result', text: 'Invest $1,850/month to stay on track' } },
  ],
  'InflationCalc': [
    { t: 'Enter an amount', d: { k: 'fields', rows: [['Today', '$10,000'], ['Inflation', '5%']] } },
    { t: 'Jump 20 years ahead', d: { k: 'count', to: 26533, label: 'future cost' } },
    { t: 'See the erosion', d: { k: 'stats', items: [['−62%', 'buying power'], ['14.2y', 'to halve']] } },
  ],
  'PaletteForge': [
    { t: 'Pick a base colour', d: { k: 'fields', rows: [['Base', '#4E8FC4']] } },
    { t: 'Generates 5 shades', d: { k: 'chips', items: ['Primary', 'Light', 'Dark', 'Accent'], on: 0 } },
    { t: 'Check WCAG contrast', d: { k: 'stats', items: [['4.8:1', 'vs white'], ['AA', 'rating']] } },
  ],
  'TypographyScale': [
    { t: 'Set base size & ratio', d: { k: 'fields', rows: [['Base', '16px'], ['Ratio', '1.25']] } },
    { t: 'Get 9 scale steps', d: { k: 'table', rows: [['sm', '12.8px'], ['xl', '31.25px']] } },
    { t: 'Export CSS or Tailwind', d: { k: 'result', text: '--font-size-lg: 1.25rem;' } },
  ],
  'IconExplorer': [
    { t: 'Search by name', d: { k: 'text', text: 'search: "arrow"' } },
    { t: 'Style stroke & colour', d: { k: 'chips', items: ['2px', 'Accent'], on: 1 } },
    { t: 'Copy as SVG or JSX', d: { k: 'result', text: '<ArrowRight />' } },
  ],
  'ShadowStudio': [
    { t: 'Pick a preset', d: { k: 'chips', items: ['Flat', 'Material', 'Glass'], on: 1 } },
    { t: 'Tune each layer', d: { k: 'fields', rows: [['Blur', '16px'], ['Opacity', '20%']] } },
    { t: 'Copy the CSS', d: { k: 'result', text: 'box-shadow: 0 8px 16px...' } },
  ],
  'SpacingCalc': [
    { t: 'Set a base unit', d: { k: 'fields', rows: [['Base', '4px'], ['Method', 'Multiplicative']] } },
    { t: 'See the scale', d: { k: 'table', rows: [['sp-2', '6px'], ['sp-6', '30.4px']] } },
    { t: 'Export as tokens', d: { k: 'result', text: '"sp-4": { "value": "13.5px" }' } },
  ],
  'GradientMaker': [
    { t: 'Choose a type', d: { k: 'chips', items: ['Linear', 'Radial', 'Conic'], on: 0 } },
    { t: 'Add colour stops', d: { k: 'fields', rows: [['Stop 1', '#4E8FC4'], ['Stop 2', '#8A5CD6']] } },
    { t: 'Copy the CSS', d: { k: 'result', text: 'linear-gradient(90deg, ...)' } },
  ],
  'FocusTimer': [
    { t: 'Pick a mode', d: { k: 'chips', items: ['Focus 25m', 'Short break 5m'], on: 0 } },
    { t: 'Watch the ring count down', d: { k: 'count', to: 25, label: 'minutes left' } },
    { t: 'Get notified & track stats', d: { k: 'stats', items: [['4', 'sessions today'], ['1.7h', 'this week']] } },
  ],
  'QuickNote': [
    { t: 'Start typing', d: { k: 'text', text: 'Ideas for Q3 roadmap...' } },
    { t: 'Autosaves as you go', d: { k: 'result', text: 'Saved' } },
    { t: 'Export as .txt or .md', d: { k: 'chips', items: ['.txt', '.md'], on: 1 } },
  ],
  'DecisionMatrix': [
    { t: 'Add options & criteria', d: { k: 'fields', rows: [['Option', 'MacBook Air'], ['Weight', 'Performance ×5']] } },
    { t: 'Rate each option', d: { k: 'table', rows: [['Price', '7/10'], ['Performance', '8/10']] } },
    { t: 'See the winner', d: { k: 'result', text: 'MacBook Air wins — 7.4' } },
  ],
  'MeetingTimer': [
    { t: 'Add attendees & salaries', d: { k: 'fields', rows: [['Attendees', '6'], ['Avg salary', '$95k']] } },
    { t: 'Press start', d: { k: 'count', to: 84.20, label: 'dollars so far' } },
    { t: 'Get a budget alert', d: { k: 'result', text: '⚠ Over budget: $500' } },
  ],
  'HabitTracker': [
    { t: 'Add a habit', d: { k: 'fields', rows: [['Habit', 'Read 20 min']] } },
    { t: 'Check it off daily', d: { k: 'chips', items: ['Mon ✓', 'Tue ✓', 'Wed ✓'], on: 2 } },
    { t: 'Watch your streak grow', d: { k: 'count', to: 12, label: 'day streak' } },
  ],
  'ReadingList': [
    { t: 'Save something to read', d: { k: 'fields', rows: [['Title', 'Designing Data-Intensive Apps'], ['Type', 'Book']] } },
    { t: 'Track your status', d: { k: 'chips', items: ['To read', 'Reading', 'Done'], on: 1 } },
    { t: 'Add notes & export', d: { k: 'result', text: 'Great chapter on replication' } },
  ],
};

function dType(text, delay) {
  const len = [...String(text)].length;
  const ds = delay ? (';animation-delay:' + delay) : '';
  return '<span class="d-type" style="--len:' + len + ds + '">' + escapeHtml(text) + '</span>';
}

function demoMarkup(d) {
  switch (d.k) {
    case 'text':
      return '<div class="d-scr">' + dType(d.text) + '</div>';
    case 'result':
      return '<div class="d-scr d-result">' + dType(d.text) + '<span class="d-check">✓</span></div>';
    case 'fields':
      return '<div class="d-scr d-fields">' + d.rows.map(([k, v], i) =>
        '<div class="d-field"><span class="d-k">' + escapeHtml(k) + '</span>' +
        dType(v, (i * 0.55) + 's') + '</div>').join('') + '</div>';
    case 'flip':
      return '<div class="d-scr"><div class="d-flip"><div class="d-flip-i">' +
        '<div class="d-face d-front">' + escapeHtml(d.front) + '</div>' +
        '<div class="d-face d-back">' + escapeHtml(d.back) + '</div></div></div></div>';
    case 'rate':
      return '<div class="d-scr d-rate">' +
        '<span class="d-pill d-in" style="--d:0s">Hard</span>' +
        '<span class="d-pill d-in" style="--d:.15s">Medium</span>' +
        '<span class="d-pill on d-in" style="--d:.3s">Easy</span></div>';
    case 'rows':
      return '<div class="d-scr d-rows">' + d.rows.map((r, i) =>
        '<div class="d-row d-in" style="--d:' + (i * 0.25) + 's">' +
        r.map(c => '<span>' + escapeHtml(c) + '</span>').join('') + '</div>').join('') + '</div>';
    case 'count':
      return '<div class="d-scr d-count"><span class="d-num" data-to="' + d.to + '">0</span>' +
        '<span class="d-clabel">' + escapeHtml(d.label) + '</span></div>';
    case 'hl': {
      let html = escapeHtml(d.text);
      d.marks.forEach((m, i) => {
        html = html.replace(escapeHtml(m),
          '<span class="d-mk" style="--d:' + (i * 0.4) + 's">' + escapeHtml(m) + '</span>');
      });
      return '<div class="d-scr"><div class="d-hl">' + html + '</div></div>';
    }
    case 'chips':
      return '<div class="d-scr d-chips">' + d.items.map((c, i) =>
        '<span class="d-chip ' + (d.on === i ? 'on ' : '') + 'd-in" style="--d:' + (i * 0.15) + 's">' +
        escapeHtml(c) + '</span>').join('') + '</div>';
    case 'scan':
      return '<div class="d-scr"><div class="d-scan"><span>' + escapeHtml(d.text) + '</span><i class="d-sweep"></i></div></div>';
    case 'stats':
      return '<div class="d-scr d-stats">' + d.items.map(([n, l], i) =>
        '<div class="d-stat d-in" style="--d:' + (i * 0.2) + 's"><b>' + escapeHtml(n) + '</b><small>' +
        escapeHtml(l) + '</small></div>').join('') + '</div>';
    case 'table':
      return '<div class="d-scr d-tbl">' + d.rows.map((r, i) =>
        '<div class="d-trow d-in" style="--d:' + (i * 0.2) + 's"><span>' + escapeHtml(r[0]) + '</span><span>' +
        escapeHtml(r[1]) + '</span></div>').join('') + '</div>';
    case 'tweets':
      return '<div class="d-scr d-tweets">' + d.items.map((c, i) =>
        '<span class="d-tweet d-in" style="--d:' + (i * 0.25) + 's">' + escapeHtml(c) + '</span>').join('') + '</div>';
    default:
      return '';
  }
}

function initWalkthrough() {
  const tool = document.documentElement.dataset.tool || '';
  const steps = STEPS[tool];
  const main = document.querySelector('.ts-main');
  if (!steps || !main || document.querySelector('.hiw2')) return;

  const section = document.createElement('section');
  section.className = 'hiw2 reveal';
  section.innerHTML =
    '<div class="hiw2-title">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      'How it works</div>' +
    '<div class="hiw2-steps">' +
      steps.map((st, i) =>
        '<div class="hiw2-step">' +
          '<span class="hiw2-num">' + (i + 1) + '</span>' +
          '<div class="hiw2-step-title">' + escapeHtml(st.t) + '</div>' +
          '<div class="ts-hiw-demo">' + demoMarkup(st.d) + '</div>' +
        '</div>'
      ).join('') +
    '</div>';
  main.appendChild(section);
  initSequencer(section);
}

// Play steps one at a time, looping; pause when off-screen.
function initSequencer(section) {
  const steps = [...section.querySelectorAll('.hiw2-step')];
  if (!steps.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach(s => s.classList.add('playing'));
    steps.forEach(runCount);
    return;
  }
  let i = -1, timer = null;
  const advance = () => {
    i = (i + 1) % steps.length;
    steps.forEach((s, j) => s.classList.toggle('playing', j === i));
    runCount(steps[i]);
  };
  const start = () => { if (timer) return; advance(); timer = setInterval(advance, 2900); };
  const stop = () => { clearInterval(timer); timer = null; };
  const io = new IntersectionObserver((es) => {
    es.forEach(e => (e.isIntersecting ? start() : stop()));
  }, { threshold: 0 });
  io.observe(section);
}

function runCount(stepEl) {
  const num = stepEl.querySelector('.d-num');
  if (!num) return;
  const to = parseFloat(num.dataset.to);
  const dec = (String(num.dataset.to).split('.')[1] || '').length;
  const t0 = performance.now(), dur = 1100;
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    num.textContent = (to * p).toFixed(dec);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Scroll reveal ─────────────────────────────────────────────────────────

function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sel = '.ts-hero, .ts-home-section-title, .ts-tool-header, .ts-card, .ts-hub-card, .ts-stats-grid, .ts-privacy-strip, .ts-callout, .gc-tab, .hiw2';
  const els = [...document.querySelectorAll(sel)];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  let i = 0;
  els.forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    el.style.transitionDelay = Math.min(i * 45, 220) + 'ms';
    io.observe(el);
    i++;
  });
}

// ── Prerender internal links on hover (instant navigation) ──────────────────

function initSpeculation() {
  if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
  if (document.querySelector('script[type="speculationrules"]')) return;
  const s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify({
    prerender: [{
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/privacy.html' } }] },
      eagerness: 'moderate'
    }]
  });
  document.head.appendChild(s);
}

// ── "View source" link (trust through transparency) ─────────────────────────
// Every page links to its own folder in the public GitHub repo so anyone can
// audit exactly what the tool does before trusting it with their data.

const REPO_URL = 'https://github.com/mohan-venkatakrishnan/tapdot-tools/tree/main';

function initSourceLink() {
  const footer = document.querySelector('.ts-footer');
  if (!footer || footer.querySelector('.ts-source-link')) return;
  let path = location.pathname.replace(/index\.html$/, '');
  if (path.endsWith('/')) path = path.slice(0, -1);
  const a = document.createElement('a');
  a.className = 'ts-source-link';
  a.href = REPO_URL + (path || '');
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = "Audit this tool's source code on GitHub";
  a.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>' +
    ' View source';
  const dot = document.createElement('span');
  dot.className = 'ts-footer-dot';
  dot.textContent = '·';
  footer.appendChild(dot);
  footer.appendChild(a);
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDarkToggle();
  initSourceLink();
  initFavicon();
  initBackground();
  initBackButton();
  initBreadcrumb();
  initSearch();
  enhanceSearchableSelects();
  initToolIcon();
  initWalkthrough();
  initReveal();
  initSpeculation();
});
