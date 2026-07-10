const test = require('node:test');
const assert = require('node:assert');
const { calculateDose } = require('../src/engine.js');

test('Test Case 1: Normal renal function (eCrCL > 50)', () => {
  const res = calculateDose({
    weightKg: 60,
    isAdult: true,
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.loadAztreonamMg, 2000);
  assert.strictEqual(res.data.loadAvibactamMg, 670);
  assert.strictEqual(res.data.maintAztreonamMg, 1500);
  assert.strictEqual(res.data.maintAvibactamMg, 500);
  assert.strictEqual(res.data.drawVolumeLoadMl, 15.2); // 2000 / 131.2 = 15.2
  assert.strictEqual(res.data.drawVolumeMaintMl, 11.4); // 1500 / 131.2 = 11.4
  assert.strictEqual(res.data.frequency, 'q6h');
  assert.strictEqual(res.data.duration, '3 小时');
  assert.strictEqual(res.data.source, '注射用氨曲南阿维巴坦钠说明书 说明书表1 (2025年06月版)');
});

test('Test Case 2: Moderate renal impairment (eCrCL 31-50)', () => {
  const res = calculateDose({
    weightKg: 70,
    isAdult: true,
    renalStatus: 'eCrCL 31-50'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.loadAztreonamMg, 2000);
  assert.strictEqual(res.data.maintAztreonamMg, 750);
  assert.strictEqual(res.data.maintAvibactamMg, 250);
  assert.strictEqual(res.data.drawVolumeMaintMl, 5.7); // 750 / 131.2 = 5.7
  assert.strictEqual(res.data.frequency, 'q6h');
});

test('Test Case 3: Severe renal impairment (eCrCL 16-30)', () => {
  const res = calculateDose({
    weightKg: 55,
    isAdult: true,
    renalStatus: 'eCrCL 16-30'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.loadAztreonamMg, 1350);
  assert.strictEqual(res.data.loadAvibactamMg, 450);
  assert.strictEqual(res.data.maintAztreonamMg, 675);
  assert.strictEqual(res.data.maintAvibactamMg, 225);
  assert.strictEqual(res.data.drawVolumeLoadMl, 10.3); // 1350 / 131.2 = 10.3
  assert.strictEqual(res.data.drawVolumeMaintMl, 5.1); // 675 / 131.2 = 5.1
  assert.strictEqual(res.data.frequency, 'q8h');
});

test('Test Case 4: ESRD on Hemodialysis (eCrCL 6-15)', () => {
  const res = calculateDose({
    weightKg: 65,
    isAdult: true,
    renalStatus: 'eCrCL 6-15'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.loadAztreonamMg, 1000);
  assert.strictEqual(res.data.loadAvibactamMg, 330);
  assert.strictEqual(res.data.maintAztreonamMg, 675);
  assert.strictEqual(res.data.maintAvibactamMg, 225);
  assert.strictEqual(res.data.drawVolumeLoadMl, 7.6); // 1000 / 131.2 = 7.6
  assert.strictEqual(res.data.drawVolumeMaintMl, 5.1); // 675 / 131.2 = 5.1
  assert.strictEqual(res.data.frequency, 'q12h');
  assert.match(res.data.note, /血液透析/);
});

test('Test Case 5: ESRD without Dialysis (eCrCL <= 15)', () => {
  const res = calculateDose({
    weightKg: 60,
    isAdult: true,
    renalStatus: 'ESRD'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /不应使用本品/);
});

test('Test Case 6: CRRT or Peritoneal Dialysis', () => {
  const res = calculateDose({
    weightKg: 60,
    isAdult: true,
    renalStatus: 'CRRT'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /现有数据不足以/);
});

test('Test Case 7: Pediatric constraint check', () => {
  const res = calculateDose({
    weightKg: 20,
    isAdult: false,
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, false);
  assert.match(res.error, /禁止计算/);
});

test('Test Case 8: Low weight warning check (< 40 kg)', () => {
  const res = calculateDose({
    weightKg: 35,
    isAdult: true,
    renalStatus: 'eCrCL > 50'
  });
  assert.strictEqual(res.success, true);
  assert.match(res.data.note, /低体重/);
});
