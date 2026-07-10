const test = require('node:test');
const assert = require('node:assert');
const { calculateDose } = require('../src/engine.js');

test('Adult Case 1: Normal renal (Regular)', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 60,
    renalStatus: 'normal',
    isSevereInfection: false,
    hasHepaticImpairment: false
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 3000);
  assert.strictEqual(res.data.cfpDoseMg, 2000);
  assert.strictEqual(res.data.sbtDoseMg, 1000);
  assert.strictEqual(res.data.drawVolumeMl, 8.0); // 3000 / 375 = 8.0
  assert.strictEqual(res.data.frequency, 'q12h');
});

test('Adult Case 2: Normal renal (Severe)', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 60,
    renalStatus: 'normal',
    isSevereInfection: true
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 6000);
  assert.strictEqual(res.data.cfpDoseMg, 4000);
  assert.strictEqual(res.data.sbtDoseMg, 2000);
  assert.strictEqual(res.data.drawVolumeMl, 16.0); // 6000 / 375 = 16.0
});

test('Adult Case 3: Moderate renal (CrCL 15-30)', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 60,
    renalStatus: 'CrCL 15-30',
    isSevereInfection: false
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 3000);
  assert.strictEqual(res.data.frequency, 'q12h');
});

test('Adult Case 4: Moderate renal + Hepatic Impairment', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 60,
    renalStatus: 'CrCL 15-30',
    hasHepaticImpairment: true
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 1500); // capped at 3g daily total = 1.5g q12h
  assert.match(res.data.note, /肝肾联合损害警示/);
});

test('Adult Case 5: Hemodialysis (HD)', () => {
  const res = calculateDose({
    isAdult: true,
    weightKg: 60,
    renalStatus: 'HD'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 1500);
  assert.match(res.data.note, /血液透析患者/);
});

test('Pediatric Case 6: Regular child (20kg, q8h)', () => {
  const res = calculateDose({
    isAdult: false,
    weightKg: 20,
    renalStatus: 'normal',
    pediatricFrequency: 'q8h'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.frequency, 'q8h');
  assert.strictEqual(res.data.singleDoseLowMg, 200); // (30 * 20) / 3 = 200
  assert.strictEqual(res.data.singleDoseHighMg, 400); // (60 * 20) / 3 = 400
  assert.strictEqual(res.data.drawVolumeText, '0.5 ~ 1.1 mL'); // 200/375 = 0.53, 400/375 = 1.07
});

test('Pediatric Case 7: Neonate <= 7 days (3kg)', () => {
  const res = calculateDose({
    isAdult: false,
    weightKg: 3,
    renalStatus: 'normal',
    isNeonate1w: true
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.frequency, 'q12h'); // Neonate <= 7d is strictly q12h
  assert.strictEqual(res.data.singleDoseLowMg, 45); // (30 * 3) / 2 = 45
  assert.strictEqual(res.data.singleDoseHighMg, 90); // (60 * 3) / 2 = 90
});

test('Pediatric Case 8: Severe Infection child (10kg, q8h)', () => {
  const res = calculateDose({
    isAdult: false,
    weightKg: 10,
    renalStatus: 'normal',
    isSevereInfection: true,
    pediatricFrequency: 'q8h'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.singleDoseMg, 800); // (240 * 10) / 3 = 800
  assert.strictEqual(res.data.drawVolumeMl, 2.1); // 800 / 375 = 2.13
});
