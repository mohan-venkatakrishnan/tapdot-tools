// LeaveCalculator — accrual, balance, carry-forward (date math)

const $ = (id) => document.getElementById(id);
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((b - a) / DAY);

function calcLeave({ annualEntitlement, carryLimit, startDate, asOfDate, taken, priorCarry }) {
  const year = asOfDate.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const policyStart = startDate > jan1 ? startDate : jan1;
  const totalDaysInPeriod = Math.max(1, daysBetween(policyStart, dec31) + 1);
  const elapsedDays = Math.min(totalDaysInPeriod, Math.max(0, daysBetween(policyStart, asOfDate) + 1));

  const fullYearEntitlement = annualEntitlement * (totalDaysInPeriod / 365);
  const accrued = annualEntitlement * (elapsedDays / 365);
  const carryForward = Math.min(priorCarry, carryLimit);
  const available = accrued + carryForward - taken;
  const remainingThisYear = fullYearEntitlement - taken;
  const projectedYearEnd = carryForward + fullYearEntitlement - taken;

  return { accrued, available, remainingThisYear, projectedYearEnd };
}

function fmt(n) { return n.toFixed(1); }

function render() {
  const annualEntitlement = parseFloat($('annualEntitlement').value) || 0;
  const carryLimit = parseFloat($('carryLimit').value) || 0;
  const startDate = $('startDate').value ? new Date($('startDate').value + 'T00:00:00') : new Date(new Date().getFullYear(), 0, 1);
  const asOfDate = $('asOfDate').value ? new Date($('asOfDate').value + 'T00:00:00') : new Date();
  const taken = parseFloat($('taken').value) || 0;
  const priorCarry = parseFloat($('priorCarry').value) || 0;

  const r = calcLeave({ annualEntitlement, carryLimit, startDate, asOfDate, taken, priorCarry });
  $('accrued').textContent = fmt(r.accrued) + ' d';
  $('available').textContent = fmt(r.available) + ' d';
  $('available').className = 'ts-stat-num ' + (r.available < 0 ? 'ts-text-danger' : 'ts-text-success');
  $('remaining').textContent = fmt(r.remainingThisYear) + ' d';
  $('projected').textContent = fmt(r.projectedYearEnd) + ' d';
}

if (!$('asOfDate').value) $('asOfDate').value = new Date().toISOString().slice(0, 10);
if (!$('startDate').value) $('startDate').value = new Date(new Date().getFullYear() - 1, 5, 1).toISOString().slice(0, 10);

['annualEntitlement', 'carryLimit', 'startDate', 'asOfDate', 'taken', 'priorCarry'].forEach(id => $(id).addEventListener('input', render));
render();
