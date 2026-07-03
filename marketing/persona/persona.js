// PersonaBuilder — AI-assisted customer personas, saved locally

const LS = 'tapdot-personas';
const $ = (id) => document.getElementById(id);

function getSaved() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function setSaved(list) { localStorage.setItem(LS, JSON.stringify(list)); }

const PERSONA_PROMPT = ({ segment, product, pains }) =>
`Create a detailed, realistic customer persona for a ${segment} who uses ${product}.
Their main pain points are: ${pains}.
Respond with ONLY a JSON object with these fields: name, age, job_title, company_size,
location, goals (array of 3), frustrations (array of 3), channels (array of 3),
buying_triggers (array of 2), objections (array of 2), quote (1 sentence), bio (2 sentences).`;

function extractJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function personaCard(p, id) {
  const list = (arr) => (arr || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  return `<div class="biz-item-card">
    <div class="biz-row" style="justify-content:space-between">
      <div>
        <div class="biz-item-title">${escapeHtml(p.name || 'Unnamed persona')}</div>
        <div class="biz-item-meta">${escapeHtml(p.job_title || '')} · ${escapeHtml(p.age || '')} · ${escapeHtml(p.location || '')}</div>
      </div>
      ${id ? `<button class="ts-btn ts-btn-ghost" data-rm="${id}" style="height:30px;padding:0 10px">Remove</button>` : `<button class="ts-btn ts-btn-secondary" id="saveThisBtn" style="height:30px;padding:0 10px">Save</button>`}
    </div>
    <p style="font-style:italic;color:var(--color-muted);margin:8px 0;font-size:13px">"${escapeHtml(p.quote || '')}"</p>
    <p style="font-size:13px;margin-bottom:10px">${escapeHtml(p.bio || '')}</p>
    <div class="biz-grid-2">
      <div><p class="ts-card-label">Goals</p><ul style="padding-left:16px;font-size:13px">${list(p.goals)}</ul></div>
      <div><p class="ts-card-label">Frustrations</p><ul style="padding-left:16px;font-size:13px">${list(p.frustrations)}</ul></div>
      <div><p class="ts-card-label">Channels</p><ul style="padding-left:16px;font-size:13px">${list(p.channels)}</ul></div>
      <div><p class="ts-card-label">Buying triggers</p><ul style="padding-left:16px;font-size:13px">${list(p.buying_triggers)}</ul></div>
    </div>
    ${p.objections && p.objections.length ? `<p class="ts-card-label ts-mt-sm">Objections</p><ul style="padding-left:16px;font-size:13px">${list(p.objections)}</ul>` : ''}
  </div>`;
}

let currentPersona = null;

// Structured skeleton persona built from the brief — real fields the user can
// refine by hand when on-device AI can't invent the details for them.
function templatePersona(segment, product, pains) {
  const painList = pains.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  while (painList.length < 3) painList.push('(add a frustration)');
  return {
    name: 'Alex (rename me)',
    age: '30–45',
    job_title: segment,
    company_size: '(company size)',
    location: '(location)',
    goals: [`Succeed as a ${segment}`, `Get more value from ${product}`, '(add a goal)'],
    frustrations: painList.slice(0, 3),
    channels: ['(where do they hang out?)', 'e.g. LinkedIn, newsletters', 'e.g. peer communities'],
    buying_triggers: [`A pain point becomes urgent: ${painList[0]}`, '(add a trigger)'],
    objections: ['(price? switching cost?)', '(add an objection)'],
    quote: `As a ${segment}, I need ${product} to just work.`,
    bio: `A ${segment} evaluating ${product}. Their day-to-day is shaped by: ${pains}.`,
  };
}

async function generate() {
  const segment = $('segment').value.trim() || 'a customer';
  const product = $('product').value.trim() || 'the product';
  const pains = $('pains').value.trim() || 'general frustrations';
  const status = $('aiStatus');
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    currentPersona = templatePersona(segment, product, pains);
    $('output').innerHTML = personaCard(currentPersona, null);
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — here is a structured skeleton built from your brief. Fill in the placeholders, or enable Chrome\'s built-in AI for a fully written persona.';
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(PERSONA_PROMPT({ segment, product, pains }));
    if (session.destroy) session.destroy();
    const parsed = extractJson(raw);
    if (!parsed) throw new Error('unparseable');
    currentPersona = parsed;
    $('output').innerHTML = personaCard(parsed, null);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'Could not generate a persona — try rephrasing, or try again.';
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);

$('output').addEventListener('click', (e) => {
  if (e.target.id === 'saveThisBtn' && currentPersona) {
    const list = getSaved();
    list.unshift(currentPersona);
    setSaved(list.slice(0, 20));
    renderSaved();
  }
});

function renderSaved() {
  const list = getSaved();
  $('saved').innerHTML = list.length
    ? list.map((p, i) => personaCard(p, i)).join('')
    : '<p class="biz-muted">No saved personas yet.</p>';
}
$('saved').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  const list = getSaved();
  list.splice(+b.dataset.rm, 1);
  setSaved(list);
  renderSaved();
});

renderSaved();
