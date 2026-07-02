// EquityCalc — startup equity & dilution calculator

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();

function calcRound({ existingShares, optionPool, investment, preMoney }) {
  const pricePerShare = preMoney / existingShares;
  const newInvestorShares = pricePerShare > 0 ? investment / pricePerShare : 0;
  const totalShares = existingShares + optionPool + newInvestorShares;
  const postMoney = preMoney + investment;
  const dilution = (optionPool + newInvestorShares) / totalShares;
  return {
    pricePerShare, newInvestorShares, totalShares, postMoney, dilution,
    existingPct: existingShares / totalShares,
    optionPct: optionPool / totalShares,
    newInvestorPct: newInvestorShares / totalShares,
  };
}

function render() {
  const existingShares = Math.max(1, parseFloat($('existingShares').value) || 1);
  const optionPool = Math.max(0, parseFloat($('optionPool').value) || 0);
  const investment = Math.max(0, parseFloat($('investment').value) || 0);
  const preMoney = Math.max(1, parseFloat($('preMoney').value) || 1);

  const r = calcRound({ existingShares, optionPool, investment, preMoney });

  $('newShares').textContent = Math.round(r.newInvestorShares).toLocaleString();
  $('pricePerShare').textContent = '$' + r.pricePerShare.toFixed(4);
  $('postMoney').textContent = fmtMoney(r.postMoney);
  $('dilution').textContent = (r.dilution * 100).toFixed(1) + '%';

  $('table').innerHTML = '<thead><tr><th>Stakeholder</th><th>Shares</th><th>Ownership</th></tr></thead><tbody>' +
    `<tr><td>Existing holders</td><td>${existingShares.toLocaleString()}</td><td>${(r.existingPct * 100).toFixed(2)}%</td></tr>` +
    `<tr><td>Option pool</td><td>${optionPool.toLocaleString()}</td><td>${(r.optionPct * 100).toFixed(2)}%</td></tr>` +
    `<tr><td>New investors</td><td>${Math.round(r.newInvestorShares).toLocaleString()}</td><td>${(r.newInvestorPct * 100).toFixed(2)}%</td></tr>` +
    `<tr><td><strong>Total</strong></td><td><strong>${Math.round(r.totalShares).toLocaleString()}</strong></td><td><strong>100%</strong></td></tr>` +
    '</tbody>';
}

['existingShares', 'optionPool', 'investment', 'preMoney'].forEach(id => $(id).addEventListener('input', render));
render();
