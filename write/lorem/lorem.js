// LoremCraft — placeholder text in 10 styles, generated locally

const STYLES = {
  classic:   'Classic Lorem Ipsum',
  english:   'Realistic English',
  startup:   'Startup Jargon',
  legal:     'Legal Language',
  tech:      'Technical Documentation',
  casual:    'Casual Conversation',
  academic:  'Academic Writing',
  headlines: 'News Headlines',
  product:   'Product Descriptions',
  minimal:   'Minimal Single-Word Blocks',
};

// Classic lorem word bank (assembled into sentences at runtime)
const LOREM_WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do ' +
  'eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam ' +
  'quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat ' +
  'duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla ' +
  'pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia ' +
  'deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error ' +
  'voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ' +
  'architecto beatae vitae dicta sunt explicabo nemo enim ipsam quia voluptas').split(' ');

const MINIMAL_WORDS = ('focus clarity space calm balance simple pure light quiet still ' +
  'form flow ease depth line grid tone shape edge rest open warm true bold soft near').split(' ');

const POOLS = {
  english: [
    "The morning light spread slowly across the quiet valley below.",
    "She had never considered how much a single choice could change everything.",
    "There was a comfortable silence between them as the train pulled away.",
    "Most people underestimate how quickly a small habit compounds over time.",
    "The old house on the corner had stories no one alive could tell.",
    "He walked the same route every day, noticing something new each time.",
    "Rain tapped gently against the window while the kettle began to whistle.",
    "It is easy to forget how far you have come when the path is long.",
    "The market was loud, colourful, and full of the smell of fresh bread.",
    "They agreed to meet again once the season had finally turned.",
    "A good conversation can shift the whole shape of an ordinary afternoon.",
    "Somewhere in the distance a dog barked twice and then fell silent.",
    "The plan was simple, though nothing about the week had been simple.",
    "She kept the letter for years without ever reading it again.",
    "Every ending carries the quiet beginning of something else entirely.",
    "The children raced ahead, laughing at a joke only they understood.",
    "He learned to trust the parts of the story he could not yet see.",
    "The city looked different from the rooftop, smaller and somehow kinder.",
    "Time moved strangely in that room, both too fast and far too slow.",
    "In the end, it was the small kindnesses that she remembered most.",
  ],
  startup: [
    "We're disrupting the paradigm with synergistic blockchain solutions.",
    "Our AI-driven platform leverages machine learning to unlock value at scale.",
    "This quarter we're doubling down on our core competencies to move the needle.",
    "We're building a best-in-class experience for the next generation of users.",
    "Our north-star metric is engagement, and we're laser-focused on retention.",
    "Let's circle back offline and align on the go-to-market strategy.",
    "We need to productize the learnings and operationalize them at velocity.",
    "The runway is tight, so we're optimizing for a lean, agile burn.",
    "Our flywheel is spinning up as network effects compound across cohorts.",
    "We're pivoting to a frictionless, mobile-first, community-led motion.",
    "The TAM is enormous and we're perfectly positioned to capture it.",
    "We ship fast, iterate faster, and let data drive every decision.",
    "Our moat is our culture, and culture eats strategy for breakfast.",
    "We're hiring rockstars who can wear many hats and bias toward action.",
    "This is a category-defining opportunity to build the future of work.",
    "We're radically transparent, deeply mission-driven, and relentlessly customer-obsessed.",
    "Growth is a team sport, and we're playing to win at hypergrowth.",
    "Let's dogfood the MVP and de-risk the roadmap before the raise.",
    "We're democratizing access and lowering the barrier to entry for everyone.",
    "At the end of the day, we're just trying to add value and delight users.",
  ],
  legal: [
    "Notwithstanding the foregoing, the parties hereto agree to the following terms.",
    "The indemnifying party shall hold harmless the indemnified party from any claims.",
    "This agreement shall be construed in accordance with the laws of the jurisdiction.",
    "Each party represents and warrants that it has full authority to enter this agreement.",
    "Nothing herein shall be deemed to create a partnership between the parties.",
    "The prevailing party shall be entitled to recover reasonable attorneys' fees.",
    "Time is of the essence with respect to all obligations set forth herein.",
    "The terms hereof shall be binding upon the successors and permitted assigns.",
    "In the event of any conflict, the provisions of this Section shall control.",
    "The waiver of any breach shall not constitute a waiver of any subsequent breach.",
    "This instrument constitutes the entire agreement between the parties hereto.",
    "Any notice required hereunder shall be delivered in writing to the address of record.",
    "The parties hereby submit to the exclusive jurisdiction of the aforesaid courts.",
    "Severability shall apply such that invalid provisions do not void the remainder.",
    "The recitals set forth above are incorporated herein by reference in their entirety.",
    "No amendment shall be effective unless executed in writing by both parties.",
    "The Company shall not be liable for any indirect or consequential damages.",
    "Force majeure events shall excuse performance for the duration of such events.",
    "Confidential information shall be maintained in strict confidence at all times.",
    "This agreement may be executed in counterparts, each deemed an original.",
  ],
  tech: [
    "Initialize the client by passing your configuration object to the constructor.",
    "The function returns a promise that resolves once the request completes.",
    "Ensure the environment variable is set before invoking the build script.",
    "Requests are rate-limited to one hundred calls per minute per API key.",
    "The middleware intercepts each request and attaches the authenticated user.",
    "Use the migration command to apply pending schema changes to the database.",
    "The response payload is serialized as JSON with a UTF-8 character encoding.",
    "Configure the retry policy to handle transient failures gracefully.",
    "The cache layer stores computed results for up to sixty seconds by default.",
    "Deploy the service behind a load balancer to distribute incoming traffic.",
    "Each module exports a single default handler and a set of named helpers.",
    "Validation errors are returned with a 422 status and a structured error body.",
    "The worker consumes messages from the queue and acknowledges on success.",
    "Set the log level to debug to inspect the full request lifecycle.",
    "The endpoint accepts an optional cursor parameter for paginated results.",
    "Run the test suite in watch mode to re-run affected tests on save.",
    "Tokens expire after one hour and must be refreshed using the refresh grant.",
    "The schema enforces a unique constraint on the combination of both columns.",
    "Enable feature flags per environment through the configuration dashboard.",
    "The container exposes a health check endpoint on the standard port.",
  ],
  casual: [
    "Honestly, I was not expecting today to go the way it did at all.",
    "So I texted them back and, yeah, we're grabbing coffee later.",
    "Wait, did you actually watch the whole thing in one sitting?",
    "Not gonna lie, that was way better than I thought it'd be.",
    "Anyway, long story short, we ended up staying way too late.",
    "I mean, it's fine, but it's not exactly what I had in mind.",
    "Okay but can we talk about how good that playlist was though.",
    "I keep meaning to call them, I just never find the right time.",
    "You know how it goes, one thing leads to another and boom.",
    "Honestly same, I've been putting that off for like three weeks.",
    "It's one of those weeks where everything happens at once.",
    "I'll probably regret this later but let's just do it anyway.",
    "Ha, no way, I literally just said the exact same thing.",
    "Give me like five minutes and then I'm totally ready to go.",
    "That reminds me, did you ever hear back about the thing?",
    "Low-key I think this might be my new favourite spot in town.",
    "We should definitely do this again, like actually this time.",
    "I'm exhausted but in a good way, if that makes any sense.",
    "Trust me, you're gonna want to see this before it's gone.",
    "Alright, catch you later, and text me when you get home.",
  ],
  academic: [
    "This study examines the relationship between the two variables in question.",
    "Prior research has largely neglected the nuances of this particular context.",
    "The findings suggest a statistically significant correlation across the sample.",
    "It is important to acknowledge the limitations inherent in this methodology.",
    "The data were analysed using a mixed-methods approach to ensure rigour.",
    "These results are consistent with the theoretical framework outlined above.",
    "Further investigation is warranted to establish a causal mechanism.",
    "The literature reveals a persistent gap that this paper seeks to address.",
    "Participants were selected according to a stratified sampling procedure.",
    "The implications of these observations extend beyond the immediate domain.",
    "A critical reading of the sources problematizes the conventional narrative.",
    "The evidence, taken together, points toward a more complex interpretation.",
    "This section situates the argument within the broader scholarly discourse.",
    "The hypothesis was tested against a control group under identical conditions.",
    "Contrary to expectation, the intervention produced a modest negative effect.",
    "The theoretical contribution of this work lies in its integrative synthesis.",
    "Subsequent sections elaborate on each of these dimensions in turn.",
    "The analysis proceeds in three stages, each building on the last.",
    "These conclusions must be interpreted with appropriate caution.",
    "In sum, the present study advances our understanding of the phenomenon.",
  ],
  headlines: [
    "Local Council Approves Long-Awaited Plan to Revitalize the Waterfront",
    "Researchers Announce Breakthrough That Could Reshape the Industry",
    "Markets Rally as Investors Weigh Signs of a Cooling Economy",
    "New Study Links Everyday Habit to Surprising Long-Term Benefits",
    "Community Rallies to Save Historic Theatre From Demolition",
    "Officials Warn of Delays as Storm System Moves Across the Region",
    "Startup Raises Record Funding to Expand Into Global Markets",
    "Report Reveals Growing Divide Between Cities and Rural Towns",
    "Athletes Return Home to Hero's Welcome After Stunning Upset",
    "Experts Debate the Future of Work in an Automated World",
    "City Unveils Ambitious Plan to Cut Emissions Within a Decade",
    "Small Business Owners Adapt as Shopping Habits Shift Online",
    "Volunteers Plant Thousands of Trees in Weekend Restoration Effort",
    "Leaders Reach Tentative Agreement After Marathon Negotiations",
    "Museum Opens Doors to Rare Collection for a Limited Time Only",
    "Survey Finds Optimism Rising Despite Ongoing Uncertainty",
    "Neighborhood Café Becomes Unlikely Hub for Local Artists",
    "Analysts Split on What the Latest Numbers Really Mean",
    "School District Pilots Bold New Approach to the Classroom",
    "Travellers Flock to Off-Season Destinations to Beat the Crowds",
  ],
  product: [
    "Crafted from premium materials for a finish that lasts a lifetime.",
    "Designed to fit seamlessly into your daily routine, wherever it takes you.",
    "Every detail is engineered for comfort, durability, and effortless style.",
    "Lightweight yet remarkably sturdy, it goes everywhere you do.",
    "Experience richer sound, longer battery, and a design you'll love holding.",
    "Thoughtfully packaged and ready to use straight out of the box.",
    "A timeless piece that pairs beautifully with everything you own.",
    "Built to perform under pressure and look effortless doing it.",
    "Soft to the touch, tough on the outside, and made to move with you.",
    "Upgrade your everyday with a tool that just works, every time.",
    "Sustainably sourced and responsibly made, without compromise.",
    "The perfect balance of form and function in one elegant package.",
    "Precision-tuned for the details that make all the difference.",
    "Compact enough to carry, powerful enough to rely on.",
    "Backed by a warranty as confident as the craftsmanship behind it.",
    "Available in a range of finishes to match your personal style.",
    "Intuitive controls put everything you need right at your fingertips.",
    "Made for those who expect a little more from the things they use.",
    "Enjoy setup in seconds and performance that speaks for itself.",
    "Loved by thousands, refined over years, ready for you today.",
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function randInt(max) { return Math.floor(Math.random() * max); }
function pick(arr) { return arr[randInt(arr.length)]; }

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Build one classic lorem sentence of 6–14 words.
function classicSentence() {
  const len = 6 + randInt(9);
  const words = [];
  for (let i = 0; i < len; i++) words.push(pick(LOREM_WORDS));
  let s = words.join(' ');
  // occasional comma
  if (len > 8) {
    const at = 3 + randInt(len - 5);
    words[at] = words[at] + ',';
    s = words.join(' ');
  }
  return capitalize(s) + '.';
}

function minimalBlock() {
  const len = 2 + randInt(3);
  const words = [];
  for (let i = 0; i < len; i++) words.push(capitalize(pick(MINIMAL_WORDS)));
  return words.join(' ') + '.';
}

function oneSentence(style) {
  if (style === 'classic') return classicSentence();
  if (style === 'minimal') return minimalBlock();
  return pick(POOLS[style]);
}

function makeSentences(style, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(oneSentence(style));
  return out;
}

function makeParagraph(style) {
  const n = 3 + randInt(3); // 3–5 sentences
  return makeSentences(style, n).join(' ');
}

// Words mode: keep generating until we have enough words, then trim.
function makeWords(style, n) {
  let words = [];
  while (words.length < n) {
    words = words.concat(oneSentence(style).replace(/[.]/g, '').split(/\s+/));
  }
  words = words.slice(0, n);
  let text = words.join(' ');
  return capitalize(text.replace(/^[A-Z]/, c => c)) + '.';
}

// ── Generate + format ───────────────────────────────────────────────────────

function generate() {
  const style  = document.getElementById('styleSel').value;
  const unit   = document.getElementById('unitSel').value;
  const format = document.getElementById('formatSel').value;
  let count = parseInt(document.getElementById('countInput').value, 10);
  if (isNaN(count) || count < 1) count = 1;
  count = Math.min(count, unit === 'words' ? 1000 : unit === 'sentences' ? 200 : 50);

  let blocks = []; // array of paragraph strings
  if (unit === 'paragraphs') {
    for (let i = 0; i < count; i++) blocks.push(makeParagraph(style));
  } else if (unit === 'sentences') {
    blocks = [makeSentences(style, count).join(' ')];
  } else { // words
    blocks = [makeWords(style, count)];
  }

  let output;
  if (format === 'html') {
    output = blocks.map(b => `<p>${b}</p>`).join('\n');
  } else if (format === 'markdown') {
    output = blocks.join('\n\n');
  } else {
    output = blocks.join('\n\n');
  }

  document.getElementById('loremOut').textContent = output;
  showOutput('output');
}

// ── Init ────────────────────────────────────────────────────────────────────

(function initStyles() {
  const sel = document.getElementById('styleSel');
  Object.entries(STYLES).forEach(([k, label]) => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = label;
    sel.appendChild(opt);
  });
})();

document.getElementById('genBtn').addEventListener('click', generate);
document.getElementById('copyBtn').addEventListener('click', (e) => {
  copyText(document.getElementById('loremOut').textContent, e.target);
});

generate();
