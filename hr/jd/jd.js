// JobDescriptionWriter — JD from a brief via on-device AI + inclusive language check

const $ = (id) => document.getElementById(id);

const EXCLUSIONARY = ['rockstar', 'ninja', 'guru', 'wizard', 'dominant', 'aggressive',
  'crush it', 'kill it', 'hustle', 'born leader', 'digital native', 'young', 'energetic',
  'recent grad', 'any field', 'must have degree'];

const JD_PROMPT = (f) => `Write a clear, well-structured, gender-neutral job description.
Role: ${f.title}. Team: ${f.team}.
Key responsibilities: ${f.responsibilities}.
Required skills: ${f.skills}.
Nice to have: ${f.niceToHave}.
Structure it with a short engaging intro, a "Responsibilities" section, a "Requirements" section, and a "Nice to have" section.
Use plain, inclusive language — avoid jargon like "rockstar" or "ninja". Keep it under 350 words.`;

function scanExclusionary(text) {
  const lower = text.toLowerCase();
  return EXCLUSIONARY.filter(w => lower.includes(w));
}

function templateJD(f) {
  return `${f.title || '[ROLE]'}
${f.team ? `Team: ${f.team}` : ''}

About the role
We're looking for a ${f.title || 'team member'} to join our team.

Responsibilities
${(f.responsibilities || '').split(',').map(r => `- ${r.trim()}`).filter(r => r !== '- ').join('\n')}

Requirements
${(f.skills || '').split(',').map(r => `- ${r.trim()}`).filter(r => r !== '- ').join('\n')}

Nice to have
${(f.niceToHave || '').split(',').map(r => `- ${r.trim()}`).filter(r => r !== '- ').join('\n')}`;
}

function renderFlags(text) {
  const found = scanExclusionary(text);
  $('exclusionCard').classList.toggle('ts-hidden', !found.length);
  $('exclusionTags').innerHTML = found.map(w => `<span class="exclusion-tag">${escapeHtml(w)}</span>`).join('');
}

async function generate() {
  const f = {
    title: $('title').value.trim(), team: $('team').value.trim(),
    responsibilities: $('responsibilities').value.trim(), skills: $('skills').value.trim(),
    niceToHave: $('niceToHave').value.trim(),
  };
  const status = $('aiStatus');
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — showing a plain template instead of an AI-written intro.';
    const text = templateJD(f);
    $('preview').textContent = text;
    renderFlags(text);
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Writing…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(JD_PROMPT(f));
    if (session.destroy) session.destroy();
    $('preview').textContent = raw.trim();
    renderFlags(raw);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI — scanned for exclusionary language.';
  } catch (e) {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'AI error — showing a plain template instead.';
    const text = templateJD(f);
    $('preview').textContent = text;
    renderFlags(text);
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);
$('copyBtn').addEventListener('click', (e) => copyText($('preview').textContent, e.target));
