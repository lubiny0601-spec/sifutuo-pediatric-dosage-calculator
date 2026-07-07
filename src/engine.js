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
 * Calculates Ceftazidime/Avibactam dosage based on patient clinical parameters.
 * 
 * @param {Object} inputs
 * @param {number} inputs.weightKg - Patient weight in kg (0.5 - 80)
 * @param {boolean} inputs.isPremature - Whether patient is preterm
 * @param {string} inputs.ageGroupOrPma - Gestational/postnatal age range
 * @param {string} inputs.renalStatus - Renal impairment status (eCrCL ranges or ESRD)
 * @param {boolean} [inputs.icuMode] - Whether patient is in ICU
 * @returns {Object} Result object containing success status, calculated dosages, and warnings or errors
 */
function calculateDose({ weightKg, isPremature, ageGroupOrPma, renalStatus, icuMode }) {
  // Validate weight parameter
  if (weightKg === undefined || weightKg === null || typeof weightKg !== 'number' || isNaN(weightKg)) {
    return { success: false, error: '请输入有效体重（支持范围为 0.5kg ~ 80kg）' };
  }
  if (weightKg < 0.5) {
    return { success: false, error: '请输入有效体重（支持范围为 0.5kg ~ 80kg）' };
  }
  if (weightKg > 80) {
    return { success: false, error: '超出本工具儿童体重范围，请参考成人说明书剂量进行给药' };
  }

  // Validate other required parameters
  if (!ageGroupOrPma || typeof ageGroupOrPma !== 'string') {
    return { success: false, error: '年龄或胎龄不能为空' };
  }
  if (!renalStatus || typeof renalStatus !== 'string') {
    return { success: false, error: '肾功能状态不能为空' };
  }

  // Normalize ageGroupOrPma for database rule lookup
  let normAge = '';
  const cleanAge = ageGroupOrPma.replace(/\s+/g, '');
  if (isPremature) {
    if (cleanAge.includes('26') && cleanAge.includes('30')) {
      normAge = 'PMA 26-30周';
    } else if (cleanAge.includes('31') && cleanAge.includes('44')) {
      normAge = 'PMA 31-44周';
    } else if (cleanAge.includes('44') && cleanAge.includes('52')) {
      normAge = 'PMA >44-52周';
    }
  } else {
    if (cleanAge.includes('出生') && cleanAge.includes('28')) {
      normAge = '出生-28天';
    } else if (cleanAge.includes('29') && cleanAge.includes('3')) {
      normAge = '29天-3月龄';
    } else if (cleanAge.includes('3') && cleanAge.includes('6')) {
      normAge = '3-6月龄';
    } else if (cleanAge.includes('6') && cleanAge.includes('2')) {
      normAge = '6月龄-2岁';
    } else if ((cleanAge.includes('2') || cleanAge.includes('2岁')) && cleanAge.includes('18')) {
      normAge = '2-18岁';
    }
  }

  if (!normAge) {
    return { success: false, error: '请输入或选择有效的年龄/胎龄范围' };
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
  } else if (cleanRenal.toUpperCase().includes('ESRD')) {
    normRenal = 'ESRD';
  }

  if (!normRenal) {
    return { success: false, error: '请输入或选择有效的肾功能分级' };
  }

  // Map normalized age and renal inputs to structured rules from data/rules.json
  let targetRenalRule = '';
  if (isPremature) {
    if (normRenal === 'eCrCL > 50') {
      targetRenalRule = `${normAge}且eCrCL > 50`;
    } else {
      targetRenalRule = '早产儿且eCrCL <= 50';
    }
  } else {
    if (normAge === '出生-28天' || normAge === '29天-3月龄') {
      if (normRenal === 'eCrCL > 50') {
        targetRenalRule = `${normAge}且eCrCL > 50`;
      } else {
        targetRenalRule = '足月儿<3月龄且eCrCL <= 50';
      }
    } else if (normAge === '3-6月龄') {
      if (normRenal === 'eCrCL > 50' || normRenal === 'eCrCL 31-50' || normRenal === 'eCrCL 16-30') {
        targetRenalRule = `${normAge}且${normRenal}`;
      } else {
        targetRenalRule = '3-6月龄且eCrCL < 16';
      }
    } else if (normAge === '6月龄-2岁') {
      if (normRenal === 'eCrCL > 50' || normRenal === 'eCrCL 31-50' || normRenal === 'eCrCL 16-30') {
        targetRenalRule = `${normAge}且${normRenal}`;
      } else {
        targetRenalRule = '6月龄-2岁且eCrCL < 16';
      }
    } else if (normAge === '2-18岁') {
      targetRenalRule = `${normAge}且${normRenal}`;
    }
  }

  // Lookup matched drug rule
  const matchedRule = rules.drugs.find(r => r.drug_id === 'CAZ_AVI' && r.renal_rule === targetRenalRule);
  if (!matchedRule) {
    return { success: false, error: '未找到匹配的用药规则，请查阅说明书或咨询医学团队。' };
  }

  // Safety block logic: if the rule is blocked, prevent calculation and return description
  if (matchedRule.frequency === '禁止计算') {
    return { success: false, error: matchedRule.special_warning };
  }

  // Calculate component doses
  const baseDose = matchedRule.base_dose_low;
  let calcCeftazidime = weightKg * baseDose;

  // Single dose capping based on frequency and max_daily_dose
  let singleDoseCap = 2000;
  if (matchedRule.max_daily_dose > 0) {
    const freq = matchedRule.frequency.toLowerCase();
    if (freq === 'q8h') {
      singleDoseCap = matchedRule.max_daily_dose / 3;
    } else if (freq === 'q12h') {
      singleDoseCap = matchedRule.max_daily_dose / 2;
    } else if (freq === 'q24h' || freq === 'q48h') {
      singleDoseCap = matchedRule.max_daily_dose;
    }
  }

  if (calcCeftazidime > singleDoseCap) {
    calcCeftazidime = singleDoseCap;
  }

  // Avibactam dose is 1/4 of Ceftazidime (ratio is 4:1)
  const calcAvibactam = calcCeftazidime / 4;
  const totalDoseG = (calcCeftazidime + calcAvibactam) / 1000;

  // Format warning/note messages
  let note = '';
  if (icuMode) {
    note = '重症患儿肾清除率极易快速波动，建议每日评估eCrCL并根据实时情况给药；密切观察液体平衡。';
  }

  if (matchedRule.special_warning &&
      matchedRule.special_warning !== '无特别警告' &&
      matchedRule.special_warning !== '有肾损伤体征的<3月龄患儿无推荐剂量，禁止计算') {
    note = note ? `${note} ${matchedRule.special_warning}` : matchedRule.special_warning;
  }

  const source = '思福妥®官方说明书 §4.2 用法用量 (2025年04月版)';

  return {
    success: true,
    data: {
      doseCeftazidimeMg: Number(calcCeftazidime.toFixed(2)),
      doseAvibactamMg: Number(calcAvibactam.toFixed(2)),
      totalDoseG: Number(totalDoseG.toFixed(4)),
      frequency: matchedRule.frequency,
      duration: '2 小时',
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
