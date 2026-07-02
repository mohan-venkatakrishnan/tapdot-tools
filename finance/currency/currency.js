// CurrencyConvert — rates fetched once/day, cached; conversion is local

const RATES_KEY = 'tapdot-currency-rates';
const RATES_DATE = 'tapdot-currency-date';
const API_URL = 'https://open.er-api.com/v6/latest/USD';

const CURRENCY_NAMES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', INR: 'Indian Rupee',
  AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
  SGD: 'Singapore Dollar', NZD: 'New Zealand Dollar', HKD: 'Hong Kong Dollar', ZAR: 'South African Rand',
  BRL: 'Brazilian Real', MXN: 'Mexican Peso', AED: 'UAE Dirham', SEK: 'Swedish Krona', NOK: 'Norwegian Krone',
};

const $ = (id) => document.getElementById(id);

async function getRates() {
  const today = new Date().toDateString();
  const cached = localStorage.getItem(RATES_KEY);
  const date = localStorage.getItem(RATES_DATE);
  if (cached && date === today) return { rates: JSON.parse(cached), fresh: false };

  try {
    const resp = await fetch(API_URL);
    const data = await resp.json();
    if (!data.rates) throw new Error('bad response');
    localStorage.setItem(RATES_KEY, JSON.stringify(data.rates));
    localStorage.setItem(RATES_DATE, today);
    return { rates: data.rates, fresh: true };
  } catch (e) {
    if (cached) return { rates: JSON.parse(cached), fresh: false, stale: true };
    throw e;
  }
}

function convert(amount, from, to, rates) {
  const inUSD = amount / rates[from];
  return inUSD * rates[to];
}

function populateSelects(rates) {
  const codes = Object.keys(rates).sort();
  const opts = codes.map(c => `<option value="${c}">${c}${CURRENCY_NAMES[c] ? ' — ' + CURRENCY_NAMES[c] : ''}</option>`).join('');
  $('from').innerHTML = opts;
  $('to').innerHTML = opts;
  $('from').value = 'USD';
  $('to').value = 'EUR';
  // Options/value just changed programmatically — tell any progressive-enhancement
  // wrapper (the searchable dropdown) to refresh its visible label.
  $('from').dispatchEvent(new Event('change'));
  $('to').dispatchEvent(new Event('change'));
}

let rates = null;

function render() {
  if (!rates) return;
  const amount = parseFloat($('amount').value) || 0;
  const from = $('from').value, to = $('to').value;
  const converted = convert(amount, from, to, rates);
  $('result').textContent = converted.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + to;
  const unitRate = convert(1, from, to, rates);
  $('rateLine').textContent = `1 ${from} = ${unitRate.toFixed(4)} ${to}`;
}

async function init() {
  const status = $('rateStatus');
  status.textContent = 'Loading exchange rates…';
  try {
    const res = await getRates();
    rates = res.rates;
    populateSelects(rates);
    status.textContent = res.stale
      ? 'Showing cached rates — could not reach the rate server just now.'
      : res.fresh ? 'Rates fetched just now — cached for today.' : 'Using today\'s cached rates.';
    render();
  } catch (e) {
    status.className = 'biz-muted ts-text-danger';
    status.textContent = 'Could not load exchange rates (offline, and no cache yet). Try again once you\'re online.';
  }
}

['amount', 'from', 'to'].forEach(id => $(id).addEventListener('change', render));
$('amount').addEventListener('input', render);
$('swap').addEventListener('click', () => {
  const f = $('from').value; $('from').value = $('to').value; $('to').value = f;
  render();
});

init();
