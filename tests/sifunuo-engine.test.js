const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../sifunuo/data/rules.json');
const {
  setRules,
  validateRules,
  classifyRenalStatus,
  calculateDose
} = require('../sifunuo/engine.js');
const { loadRules } = require('../sifunuo/rules-loader.js');

test('loads only a validated ATM-AVI rules document from the sifunuo-relative path', async () => {
  const requestedPaths = [];
  const fetchImpl = async (path) => {
    requestedPaths.push(path);
    return {
      ok: true,
      json: async () => rules
    };
  };

  const loaded = await loadRules(fetchImpl, validateRules);
  assert.equal(requestedPaths[0], 'data/rules.json');
  assert.deepEqual(loaded, rules);
});

test('rejects a successfully fetched document for another medicine', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ drug_id: 'CFP_SBT' })
  });

  await assert.rejects(() => loadRules(fetchImpl, validateRules), /ATM-AVI/);
});

test('rejects a rules document that is not the ATM-AVI rule set', () => {
  assert.equal(validateRules({ drug_id: 'CFP_SBT' }), false);
  assert.equal(validateRules(rules), true);
});

test('classifies exact eCrCL boundaries without rounding up', () => {
  assert.equal(classifyRenalStatus({ eCrCL: 50, renalReplacementTherapy: 'none' }), 'eCrCL 31-50');
  assert.equal(classifyRenalStatus({ eCrCL: 50.1, renalReplacementTherapy: 'none' }), 'eCrCL > 50');
  assert.equal(classifyRenalStatus({ eCrCL: 30, renalReplacementTherapy: 'none' }), 'eCrCL 16-30');
  assert.equal(classifyRenalStatus({ eCrCL: 30.1, renalReplacementTherapy: 'none' }), 'eCrCL 31-50');
  assert.equal(classifyRenalStatus({ eCrCL: 15.1, renalReplacementTherapy: 'none' }), 'eCrCL 16-30');
});

test('only classifies eCrCL at or below 15 as the HD regimen when intermittent HD is confirmed', () => {
  assert.equal(classifyRenalStatus({ eCrCL: 15, renalReplacementTherapy: 'ihd' }), 'eCrCL 6-15');
  assert.equal(classifyRenalStatus({ eCrCL: 15, renalReplacementTherapy: 'none' }), 'ESRD');
  assert.equal(classifyRenalStatus({ eCrCL: 15, renalReplacementTherapy: 'crrt' }), 'CRRT');
  assert.equal(classifyRenalStatus({ eCrCL: 15, renalReplacementTherapy: 'pd' }), 'CRRT');
});

test('blocks children and non-HD patients with eCrCL at or below 15', () => {
  setRules(rules);
  assert.equal(calculateDose({ age: 17, eCrCL: 80, renalReplacementTherapy: 'none', infectionType: 'hap_vap' }).success, false);
  assert.equal(calculateDose({ age: 40, eCrCL: 15, renalReplacementTherapy: 'none', infectionType: 'hap_vap' }).success, false);
});

test('returns every labelled adult regimen from the official ATM-AVI rules', () => {
  setRules(rules);
  const normal = calculateDose({ age: 40, eCrCL: 80, renalReplacementTherapy: 'none', infectionType: 'hap_vap' });
  const moderate = calculateDose({ age: 40, eCrCL: 45, renalReplacementTherapy: 'none', infectionType: 'hap_vap' });
  const severe = calculateDose({ age: 40, eCrCL: 20, renalReplacementTherapy: 'none', infectionType: 'hap_vap' });
  const hd = calculateDose({ age: 40, eCrCL: 15, renalReplacementTherapy: 'ihd', infectionType: 'hap_vap' });

  assert.deepEqual([normal.data.loadAztreonamMg, normal.data.loadAvibactamMg, normal.data.maintAztreonamMg, normal.data.maintAvibactamMg, normal.data.frequency, normal.data.drawVolumeLoadMl], [2000, 670, 1500, 500, 'q6h', 15.2]);
  assert.deepEqual([moderate.data.loadAztreonamMg, moderate.data.loadAvibactamMg, moderate.data.maintAztreonamMg, moderate.data.maintAvibactamMg, moderate.data.frequency], [2000, 670, 750, 250, 'q6h']);
  assert.deepEqual([severe.data.loadAztreonamMg, severe.data.loadAvibactamMg, severe.data.maintAztreonamMg, severe.data.maintAvibactamMg, severe.data.frequency], [1350, 450, 675, 225, 'q8h']);
  assert.deepEqual([hd.data.loadAztreonamMg, hd.data.loadAvibactamMg, hd.data.maintAztreonamMg, hd.data.maintAvibactamMg, hd.data.frequency], [1000, 330, 675, 225, 'q12h']);
});

test('adds the mandatory metronidazole warning for cIAI', () => {
  setRules(rules);
  const result = calculateDose({ age: 40, eCrCL: 80, renalReplacementTherapy: 'none', infectionType: 'ciai' });
  assert.equal(result.success, true);
  assert.match(result.data.note, /甲硝唑/);
});
