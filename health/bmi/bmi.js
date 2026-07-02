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

function render() {
  const weight_kg = parseFloat($('weight').value) || 0;
  const height_cm = parseFloat($('height').value) || 0;
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
  const lo = (18.5 * h * h).toFixed(1), hi = (24.9 * h * h).toFixed(1);
  $('healthyRange').textContent = `${lo}–${hi} kg`;
}

['weight', 'height', 'age', 'sex', 'activity'].forEach(id => $(id).addEventListener('input', render));
render();
