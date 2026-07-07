const test = require('node:test');
const assert = require('node:assert');
const { calculateDose } = require('../src/engine.js');

test('Test Case 1: Normal dosage calculation', () => {
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
  assert.strictEqual(res.data.source, '思福妥®官方说明书 §4.2 用法用量 (2025年04月版)');
  assert.strictEqual(res.data.note, '');
});

test('Test Case 2: Max dosage cap truncation', () => {
  const res = calculateDose({
    weightKg: 50,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 2000); // 正常是 2500mg，封顶到成人上限 2000mg
  assert.strictEqual(res.data.doseAvibactamMg, 500);
  assert.strictEqual(res.data.totalDoseG, 2.5);
  assert.strictEqual(res.data.frequency, 'q8h');
  assert.strictEqual(res.data.duration, '2 小时');
  assert.strictEqual(res.data.source, '思福妥®官方说明书 §4.2 用法用量 (2025年04月版)');
  assert.strictEqual(res.data.note, '');
});

test('Test Case 3: Newborn renal impairment intercept', () => {
  const res = calculateDose({
    weightKg: 3,
    isPremature: false,
    ageGroupOrPma: '出生 ~ <=28天',
    renalStatus: 'eCrCL 31 ~ 50'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /不足以推荐/);
});

test('Test Case 4: Under 2 years severe renal impairment intercept', () => {
  const res = calculateDose({
    weightKg: 10,
    isPremature: false,
    ageGroupOrPma: '6月龄 ~ <2岁',
    renalStatus: 'eCrCL 6 ~ 15'
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

test('Test Case 8: ESRD dosage calculation and warning note', () => {
  const res = calculateDose({
    weightKg: 20,
    isPremature: false,
    ageGroupOrPma: '2岁 ~ 18岁',
    renalStatus: 'ESRD'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.doseCeftazidimeMg, 300); // 20 * 15 = 300mg
  assert.strictEqual(res.data.doseAvibactamMg, 75); // 300 / 4 = 75mg
  assert.strictEqual(res.data.totalDoseG, 0.375);
  assert.strictEqual(res.data.frequency, 'q48h');
  assert.match(res.data.note, /血液透析/);
});
