let rules;

// Check if we are running in Node.js environment
const isNode = typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined';

if (isNode) {
  const path = require('path');
  const fs = require('fs');
  try {
    rules = require('../data/rules.json');
  } catch (e) {
    const rulesPath = path.resolve(__dirname, '../data/rules.json');
    rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  }
}

// Allow setting rules from the outside (especially in browser client-side after fetch)
function setRules(loadedRules) {
  rules = loadedRules;
}

/**
 * Calculates Aztreonam/Avibactam dosage based on patient clinical parameters.
 * 
 * @param {Object} inputs
 * @param {number} [inputs.weightKg] - Patient weight in kg (optional)
 * @param {boolean} [inputs.isAdult] - Whether patient is adult (must be true)
 * @param {string} inputs.renalStatus - Renal impairment status (eCrCL ranges, ESRD, or CRRT)
 * @returns {Object} Result object containing success status, calculated dosages, and warnings or errors
 */
function calculateDose({ weightKg, isAdult, renalStatus }) {
  // Validate adult parameter - ATM-AVI is strictly for adults (>= 18 years old)
  if (isAdult === false) {
    return { success: false, error: '本品尚未确定 18 岁以下儿童及青少年患者的安全性和疗效，禁止计算。' };
  }

  // Validate renal status
  if (!renalStatus || typeof renalStatus !== 'string') {
    return { success: false, error: '肾功能状态不能为空' };
  }

  // Normalize renalStatus for database rule lookup
  let normRenal = '';
  const cleanRenal = renalStatus.replace(/\s+/g, '');
  if (cleanRenal.includes('>50')) {
    normRenal = 'eCrCL > 50';
  } else if (cleanRenal.includes('31') && cleanRenal.includes('50')) {
    normRenal = 'eCrCL 31-50';
  } else if (cleanRenal.includes('16') && cleanRenal.includes('30')) {
    normRenal = 'eCrCL 16-30';
  } else if (cleanRenal.includes('6') && cleanRenal.includes('15')) {
    normRenal = 'eCrCL 6-15';
  } else if (cleanRenal.toUpperCase().includes('ESRD') || cleanRenal.includes('<6') || cleanRenal.includes('未透析') || cleanRenal.includes('未开始血液透析')) {
    normRenal = 'ESRD';
  } else if (cleanRenal.toUpperCase().includes('CRRT') || cleanRenal.includes('腹膜')) {
    normRenal = 'CRRT';
  }

  if (!normRenal) {
    return { success: false, error: '请输入或选择有效的肾功能分级' };
  }

  // Lookup matched drug rule
  const matchedRule = rules.drugs.find(r => r.drug_id === 'ATM_AVI' && r.renal_rule === `成人且${normRenal}`);
  if (!matchedRule) {
    return { success: false, error: '未找到匹配的用药规则，请查阅说明书或咨询医学团队。' };
  }

  // Safety block logic: if the rule is blocked, prevent calculation and return description
  if (matchedRule.frequency === '禁止计算') {
    return { success: false, error: matchedRule.special_warning };
  }

  // Validate weight if provided (optional check for low weight warning)
  let lowWeightWarning = '';
  if (weightKg !== undefined && weightKg !== null && !isNaN(weightKg)) {
    if (weightKg <= 0) {
      return { success: false, error: '请输入有效体重' };
    }
    if (weightKg < 40) {
      lowWeightWarning = '低体重成人患者（体重 < 40 kg）可能需要更严密的临床和实验室监测。';
    }
  }

  // Doses retrieval
  const loadAztreonamMg = matchedRule.load_dose_atm;
  const loadAvibactamMg = matchedRule.load_dose_avi;
  const maintAztreonamMg = matchedRule.maint_dose_atm;
  const maintAvibactamMg = matchedRule.maint_dose_avi;

  const totalLoadDoseG = (loadAztreonamMg + loadAvibactamMg) / 1000;
  const totalMaintDoseG = (maintAztreonamMg + maintAvibactamMg) / 1000;

  // Reconstituted draw volume calculation: Conc is 131.2 mg/mL Aztreonam
  const drawVolumeLoadMl = Number((loadAztreonamMg / 131.2).toFixed(1));
  const drawVolumeMaintMl = Number((maintAztreonamMg / 131.2).toFixed(1));

  let note = matchedRule.special_warning || '';
  if (lowWeightWarning) {
    note = note ? `${lowWeightWarning} ${note}` : lowWeightWarning;
  }

  const source = `注射用氨曲南阿维巴坦钠说明书 ${matchedRule.source_page || '§4.2 用法用量'} (2025年06月版)`;

  return {
    success: true,
    data: {
      loadAztreonamMg,
      loadAvibactamMg,
      maintAztreonamMg,
      maintAvibactamMg,
      totalLoadDoseG: Number(totalLoadDoseG.toFixed(4)),
      totalMaintDoseG: Number(totalMaintDoseG.toFixed(4)),
      drawVolumeLoadMl,
      drawVolumeMaintMl,
      frequency: matchedRule.frequency,
      duration: matchedRule.duration,
      source,
      note
    }
  };
}

if (isNode) {
  module.exports = { calculateDose, setRules };
} else {
  window.calculateDose = calculateDose;
  window.setRules = setRules;
}
