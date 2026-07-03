// BMICalc — BMI, BMR (Mifflin-St Jeor), TDEE, healthy weight range

const $ = (id) => document.getElementById(id);

function calcBMI({ weight_kg, height_cm }) {
  const h = height_cm / 100;
  const bmi = weight_kg / (h * h);
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
  return { bmi: bmi.toFixed(1), category };
}
function calcBMR({ weight_kg, height_cm, age, sex }) {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}
const ACTIVITY_MULTIPLIERS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };

let unit = 'metric';

function readMeasurements() {
  if (unit === 'imperial') {
    const lb = parseFloat($('weight').value) || 0;
    const ft = parseFloat($('heightFt').value) || 0;
    const inch = parseFloat($('heightIn').value) || 0;
    return { weight_kg: lb * 0.45359237, height_cm: (ft * 12 + inch) * 2.54 };
  }
  return { weight_kg: parseFloat($('weight').value) || 0, height_cm: parseFloat($('height').value) || 0 };
}

function render() {
  const { weight_kg, height_cm } = readMeasurements();
  const age = parseFloat($('age').value) || 0;
  const sex = $('sex').value;
  const activity = $('activity').value;

  const { bmi, category } = calcBMI({ weight_kg, height_cm });
  $('bmi').textContent = bmi;
  $('bmiCategory').textContent = category;

  const bmr = calcBMR({ weight_kg, height_cm, age, sex });
  $('bmr').textContent = bmr.toLocaleString();
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.2));
  $('tdee').textContent = tdee.toLocaleString();

  const h = height_cm / 100;
  const loKg = 18.5 * h * h, hiKg = 24.9 * h * h;
  $('healthyRange').textContent = unit === 'imperial'
    ? `${(loKg / 0.45359237).toFixed(0)}–${(hiKg / 0.45359237).toFixed(0)} lb`
    : `${loKg.toFixed(1)}–${hiKg.toFixed(1)} kg`;
}

$('unitTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-unit]');
  if (!b) return;
  $('unitTabs').querySelectorAll('.ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const prev = unit;
  unit = b.dataset.unit;
  // Convert the current weight so switching units doesn't change the person.
  const w = parseFloat($('weight').value) || 0;
  if (prev === 'metric' && unit === 'imperial') {
    $('weight').value = Math.round(w / 0.45359237);
    const cm = parseFloat($('height').value) || 0;
    const totalIn = cm / 2.54;
    $('heightFt').value = Math.floor(totalIn / 12);
    $('heightIn').value = Math.round(totalIn % 12);
  } else if (prev === 'imperial' && unit === 'metric') {
    $('weight').value = Math.round(w * 0.45359237);
    const ft = parseFloat($('heightFt').value) || 0, inch = parseFloat($('heightIn').value) || 0;
    $('height').value = Math.round((ft * 12 + inch) * 2.54);
  }
  $('weightLabel').textContent = unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)';
  $('heightMetric').classList.toggle('ts-hidden', unit === 'imperial');
  $('heightImperial').classList.toggle('ts-hidden', unit !== 'imperial');
  render();
});

['weight', 'height', 'heightFt', 'heightIn', 'age', 'sex', 'activity'].forEach(id => $(id).addEventListener('input', render));
render();
