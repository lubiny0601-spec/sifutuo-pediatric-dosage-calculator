const test = require('node:test');
const assert = require('node:assert');
const { calculateDose } = require('../src/engine.js');

test('Test Case 1: Normal dosage calculation (Children)', () => {
  const res = calculateDose({
    weightKg: 12,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 600);
  assert.strictEqual(res.data.doseAvibactamMg, 150);
  assert.strictEqual(res.data.totalDoseG, 0.75);
  assert.strictEqual(res.data.frequency, 'q8h');
  assert.strictEqual(res.data.duration, '2 小时');
  assert.strictEqual(res.data.source, '思福妥®官方说明书 说明书表2 (2025年04月版)');
  assert.strictEqual(res.data.note, '');
});

test('Test Case 2: Max dosage cap truncation (Children)', () => {
  const res = calculateDose({
    weightKg: 50,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 2000); // capped at adult max dose
  assert.strictEqual(res.data.doseAvibactamMg, 500);
  assert.strictEqual(res.data.totalDoseG, 2.5);
  assert.strictEqual(res.data.frequency, 'q8h');
});

test('Test Case 3: Newborn renal impairment intercept (Children)', () => {
  const res = calculateDose({
    weightKg: 3,
    isPremature: false,
    ageGroupOrPma: '出生 ~ 28天 (足月新生儿)',
    renalStatus: 'eCrCL 31-50'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /不足以推荐/);
});

test('Test Case 4: Under 2 years severe renal impairment intercept (Children)', () => {
  const res = calculateDose({
    weightKg: 10,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL 6-15'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /不足以推荐/);
});

test('Test Case 5: Weight below minimum limit', () => {
  const res = calculateDose({
    weightKg: 0.4,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /有效体重/);
});

test('Test Case 6: Weight above maximum limit', () => {
  const res = calculateDose({
    weightKg: 85,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /超出/);
});

test('Test Case 7: ICU Mode note validation', () => {
  const res = calculateDose({
    weightKg: 12,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50',
    icuMode: true
  });
  assert.strictEqual(res.success, true);
  assert.match(res.data.note, /重症/);
});

test('Test Case 8: Corrected ESRD dosage calculation (Children)', () => {
  const res = calculateDose({
    weightKg: 20,
    isPremature: false,
    ageGroupOrPma: '2岁 ~ 18岁',
    renalStatus: 'ESRD'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 375); // 20 * 18.75 = 375mg (was 300mg before correction)
  assert.strictEqual(res.data.doseAvibactamMg, 93.75); // 375 / 4 = 93.75mg
  assert.strictEqual(res.data.totalDoseG, 0.4688);
  assert.strictEqual(res.data.frequency, 'q48h');
  assert.match(res.data.note, /血液透析/);
});

test('Test Case 9: Corrected Moderate renal impairment calculation (Children)', () => {
  const res = calculateDose({
    weightKg: 10,
    isPremature: false,
    ageGroupOrPma: '3-6月龄',
    renalStatus: 'eCrCL 31-50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 200); // 10 * 20 = 200mg (was 160mg before correction)
  assert.strictEqual(res.data.doseAvibactamMg, 50);
  assert.strictEqual(res.data.frequency, 'q8h');
});

test('Test Case 10: Corrected Severe renal impairment calculation (Children)', () => {
  const res = calculateDose({
    weightKg: 20,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL 16-30'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 375); // 20 * 18.75 = 375mg (was 300mg before correction)
  assert.strictEqual(res.data.doseAvibactamMg, 93.75);
  assert.strictEqual(res.data.frequency, 'q12h');
});

test('Test Case 11: Corrected ESRD cap truncation (Children)', () => {
  const res = calculateDose({
    weightKg: 50,
    isPremature: false,
    ageGroupOrPma: '2岁 ~ 18岁',
    renalStatus: 'ESRD'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 750); // 50 * 18.75 = 937.5mg, capped at 750mg ESRD limit (was 375mg before)
  assert.strictEqual(res.data.doseAvibactamMg, 187.5);
  assert.strictEqual(res.data.frequency, 'q48h');
});

test('Test Case 12: Adult Normal dosage calculation', () => {
  const res = calculateDose({
    isAdult: true,
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 2000);
  assert.strictEqual(res.data.doseAvibactamMg, 500);
  assert.strictEqual(res.data.frequency, 'q8h');
  assert.strictEqual(res.data.source, '思福妥®官方说明书 说明书表2/表5 (2025年04月版)');
});

test('Test Case 13: Adult Moderate dosage calculation', () => {
  const res = calculateDose({
    isAdult: true,
    renalStatus: 'eCrCL 31-50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 1000);
  assert.strictEqual(res.data.doseAvibactamMg, 250);
  assert.strictEqual(res.data.frequency, 'q8h');
});

test('Test Case 14: Adult Severe dosage calculation', () => {
  const res = calculateDose({
    isAdult: true,
    renalStatus: 'eCrCL 16-30'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 750);
  assert.strictEqual(res.data.doseAvibactamMg, 187.5);
  assert.strictEqual(res.data.frequency, 'q12h');
});

test('Test Case 15: Adult Critical dosage calculation', () => {
  const res = calculateDose({
    isAdult: true,
    renalStatus: 'eCrCL 6-15'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 750);
  assert.strictEqual(res.data.doseAvibactamMg, 187.5);
  assert.strictEqual(res.data.frequency, 'q24h');
});

test('Test Case 16: Adult ESRD dosage calculation', () => {
  const res = calculateDose({
    isAdult: true,
    renalStatus: 'ESRD'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 750);
  assert.strictEqual(res.data.doseAvibactamMg, 187.5);
  assert.strictEqual(res.data.frequency, 'q48h');
  assert.match(res.data.note, /血液透析/);
});

test('Test Case 17: Adult low weight warning note validation', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 35,
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.match(res.data.note, /低体重/);
});
