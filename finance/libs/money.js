// tapdotMoney — shared currency + number-format settings for all finance tools.
// Persisted in localStorage; injects a small picker into the tool header.
// Formats: 'intl' (1,234,567 / M / B grouping) or 'in' (12,34,567 lakh/crore grouping).

const tapdotMoney = (() => {
  const LS_CUR = 'tapdot-finance-currency';
  const LS_FMT = 'tapdot-finance-format';
  const CURRENCIES = [
    ['$', 'USD $'], ['₹', 'INR ₹'], ['€', 'EUR €'], ['£', 'GBP £'], ['¥', 'JPY ¥'],
    ['A$', 'AUD A$'], ['C$', 'CAD C$'], ['S$', 'SGD S$'], ['CHF ', 'CHF'], ['R', 'ZAR R'],
    ['R$', 'BRL R$'], ['د.إ', 'AED د.إ'],
  ];

  let symbol = localStorage.getItem(LS_CUR) || '$';
  let format = localStorage.getItem(LS_FMT) || 'intl';

  function fmt(n) {
    const rounded = Math.round(n);
    const grouped = format === 'in'
      ? Math.abs(rounded).toLocaleString('en-IN')
      : Math.abs(rounded).toLocaleString('en-US');
    return (rounded < 0 ? '−' : '') + symbol + grouped;
  }

  // Compact form for stats where space is tight: 1.2M/3.4B or 12L/1.2Cr.
  function fmtCompact(n) {
    const abs = Math.abs(n), sign = n < 0 ? '−' : '';
    if (format === 'in') {
      if (abs >= 1e7) return sign + symbol + (abs / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
      if (abs >= 1e5) return sign + symbol + (abs / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
    } else {
      if (abs >= 1e9) return sign + symbol + (abs / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
      if (abs >= 1e6) return sign + symbol + (abs / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    }
    return fmt(n);
  }

  function initPicker() {
    const header = document.querySelector('.ts-tool-header');
    if (!header || document.getElementById('tapdotMoneyPicker')) return;
    const row = document.createElement('div');
    row.id = 'tapdotMoneyPicker';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap';
    row.innerHTML =
      '<select class="ts-select" id="tmCurrency" aria-label="Currency symbol" style="width:auto">' +
        CURRENCIES.map(([sym, label]) => `<option value="${sym}" ${sym === symbol ? 'selected' : ''}>${label}</option>`).join('') +
      '</select>' +
      '<div class="ts-segment">' +
        `<button class="ts-segment-btn ${format === 'intl' ? 'active' : ''}" data-tmfmt="intl" type="button">Million / Billion</button>` +
        `<button class="ts-segment-btn ${format === 'in' ? 'active' : ''}" data-tmfmt="in" type="button">Lakh / Crore</button>` +
      '</div>';
    header.appendChild(row);

    const rerender = () => {
      if (typeof window.render === 'function') window.render();
      else location.reload();
    };
    row.querySelector('#tmCurrency').addEventListener('change', (e) => {
      symbol = e.target.value;
      localStorage.setItem(LS_CUR, symbol);
      rerender();
    });
    row.querySelectorAll('[data-tmfmt]').forEach(btn => btn.addEventListener('click', () => {
      format = btn.dataset.tmfmt;
      localStorage.setItem(LS_FMT, format);
      row.querySelectorAll('[data-tmfmt]').forEach(b => b.classList.toggle('active', b === btn));
      rerender();
    }));
  }

  document.addEventListener('DOMContentLoaded', initPicker);
  return { fmt, fmtCompact, get symbol() { return symbol; } };
})();
