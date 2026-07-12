const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { calculateDose } = require('../shupushen/engine.js');

test('adult renderer displays the shared draw-volume text', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../shupushen/app.js'), 'utf8');

  assert.match(
    appSource,
    /if \(isAdult\) \{\s*recommendationTitle\.textContent = .*?;\s*drawVolumeValue\.innerHTML = `<strong>\$\{res\.data\.drawVolumeText\.replace\(' mL', ''\)\}<\/strong> mL`;/
  );
});

test('adult normal renal regular range maps to a draw-volume range', () => {
  const res = calculateDose({ isAdult: true, renalStatus: 'normal' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.rangeText, '1.5g ~ 3.0g');
  assert.strictEqual(res.data.drawVolumeText, '4 ~ 8 mL');
});

test('adult CrCL 15-30 regular range maps to a draw-volume range', () => {
  const res = calculateDose({ isAdult: true, renalStatus: 'CrCL 15-30' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.drawVolumeText, '4 ~ 8 mL');
});

test('adult severe fixed dose keeps one draw volume', () => {
  const res = calculateDose({ isAdult: true, renalStatus: 'normal', isSevereInfection: true });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.drawVolumeText, '16 mL');
  assert.strictEqual(res.data.drawVolumeMl, 16);
});
