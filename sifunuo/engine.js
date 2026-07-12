let rules;

const isNode = typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined';

function validateRules(loadedRules) {
  return Array.isArray(loadedRules?.drugs)
    && loadedRules.drugs.some((rule) => rule?.drug_id === 'ATM_AVI');
}

function setRules(loadedRules) {
  if (!validateRules(loadedRules)) {
    return false;
  }

  rules = loadedRules;
  return true;
}

function classifyRenalStatus({ eCrCL, renalReplacementTherapy }) {
  if (!Number.isFinite(eCrCL) || eCrCL <= 0) {
    return null;
  }

  if (renalReplacementTherapy === 'crrt' || renalReplacementTherapy === 'pd') {
    return 'CRRT';
  }
  if (eCrCL > 50) {
    return 'eCrCL > 50';
  }
  if (eCrCL > 30) {
    return 'eCrCL 31-50';
  }
  if (eCrCL > 15) {
    return 'eCrCL 16-30';
  }

  return renalReplacementTherapy === 'ihd' ? 'eCrCL 6-15' : 'ESRD';
}

function calculateDose({ weightKg, age, eCrCL, renalReplacementTherapy, infectionType }) {
  if (!Number.isFinite(age) || age <= 0) {
    return { success: false, error: '请输入有效年龄。' };
  }
  if (age < 18) {
    return { success: false, error: '本品尚未确定 18 岁以下儿童及青少年患者的安全性和疗效，禁止计算。' };
  }
  if (!infectionType) {
    return { success: false, error: '请选择感染类型。' };
  }
  if (!validateRules(rules)) {
    return { success: false, error: '剂量规则未正确加载，禁止计算。' };
  }

  const renalStatus = classifyRenalStatus({ eCrCL, renalReplacementTherapy });
  if (!renalStatus) {
    return { success: false, error: '请输入有效的 eCrCL。' };
  }

  const matchedRule = rules.drugs.find((rule) => (
    rule.drug_id === 'ATM_AVI' && rule.renal_rule === `成人且${renalStatus}`
  ));
  if (!matchedRule) {
    return { success: false, error: '未找到匹配的用药规则，请查阅说明书或咨询医学团队。' };
  }
  if (matchedRule.frequency === '禁止计算') {
    return { success: false, error: matchedRule.special_warning };
  }

  let lowWeightWarning = '';
  if (weightKg !== undefined && weightKg !== null && !Number.isNaN(weightKg)) {
    if (weightKg <= 0) {
      return { success: false, error: '请输入有效体重。' };
    }
    if (weightKg < 40) {
      lowWeightWarning = '低体重成人患者（体重 < 40 kg）可能需要更严密的临床和实验室监测。';
    }
  }

  const notes = [lowWeightWarning, matchedRule.special_warning];
  if (infectionType === 'ciai') {
    notes.push('治疗复杂性腹腔内感染（cIAI）时，须联用甲硝唑。');
  }

  const { load_dose_atm: loadAztreonamMg, load_dose_avi: loadAvibactamMg } = matchedRule;
  const { maint_dose_atm: maintAztreonamMg, maint_dose_avi: maintAvibactamMg } = matchedRule;

  return {
    success: true,
    data: {
      loadAztreonamMg,
      loadAvibactamMg,
      maintAztreonamMg,
      maintAvibactamMg,
      totalLoadDoseG: Number(((loadAztreonamMg + loadAvibactamMg) / 1000).toFixed(4)),
      totalMaintDoseG: Number(((maintAztreonamMg + maintAvibactamMg) / 1000).toFixed(4)),
      drawVolumeLoadMl: Number((loadAztreonamMg / 131.2).toFixed(1)),
      drawVolumeMaintMl: Number((maintAztreonamMg / 131.2).toFixed(1)),
      frequency: matchedRule.frequency,
      duration: matchedRule.duration,
      source: `注射用氨曲南阿维巴坦钠说明书 ${matchedRule.source_page || '【用法用量】'} (2025年06月版)`,
      note: notes.filter(Boolean).join(' ')
    }
  };
}

if (isNode) {
  const path = require('path');
  const fs = require('fs');
  const rulesPath = path.resolve(__dirname, 'data/rules.json');
  setRules(JSON.parse(fs.readFileSync(rulesPath, 'utf8')));
  module.exports = { calculateDose, classifyRenalStatus, setRules, validateRules };
} else {
  window.calculateDose = calculateDose;
  window.classifyRenalStatus = classifyRenalStatus;
  window.setRules = setRules;
  window.validateRules = validateRules;
}
