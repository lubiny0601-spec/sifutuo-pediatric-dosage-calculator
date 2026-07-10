let rules;

// Check if we are running in Node.js environment
const isNode = typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined';

if (isNode) {
  const path = require('path');
  const fs = require('fs');
  try {
    rules = require('../data/rules.json');
  } catch (e) {
    try {
      const rulesPath = path.resolve(__dirname, '../data/rules.json');
      rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    } catch (err) {
      console.warn("Failed to load rules.json in Node.js:", err);
    }
  }
}

// Allow setting rules from the outside (especially in browser client-side after fetch)
function setRules(loadedRules) {
  rules = loadedRules;
}

/**
 * Calculates Cefoperazone/Sulbactam dosage based on patient clinical parameters.
 * 
 * @param {Object} inputs
 * @param {boolean} inputs.isAdult - Whether patient is adult
 * @param {number} [inputs.weightKg] - Patient weight in kg
 * @param {string} inputs.renalStatus - Renal impairment status ('normal', 'CrCL_15_30', 'CrCL_lt_15', 'HD')
 * @param {boolean} [inputs.hasHepaticImpairment] - Whether patient has hepatic impairment or biliary obstruction
 * @param {boolean} [inputs.isSevereInfection] - Whether patient has severe/refractory infection
 * @param {boolean} [inputs.isNeonate1w] - (For pediatric) Whether neonate is in first week of life (<= 7 days)
 * @param {string} [inputs.pediatricFrequency] - (For pediatric) Frequency choice: 'q6h', 'q8h', 'q12h'
 * @returns {Object} Result object containing success status, calculated dosages, and warnings or errors
 */
function calculateDose({
  isAdult,
  weightKg,
  renalStatus,
  hasHepaticImpairment = false,
  isSevereInfection = false,
  isNeonate1w = false,
  pediatricFrequency = 'q8h'
}) {
  // Validate renal status
  if (!renalStatus || typeof renalStatus !== 'string') {
    return { success: false, error: '肾功能状态不能为空' };
  }

  // Normalize renalStatus
  let normRenal = 'normal';
  const cleanRenal = renalStatus.replace(/\s+/g, '').toLowerCase();
  if (cleanRenal.includes('>30') || cleanRenal === 'normal' || cleanRenal.includes('正常') || cleanRenal.includes('轻度')) {
    normRenal = 'normal';
  } else if (cleanRenal.includes('15-30') || cleanRenal.includes('15~30') || cleanRenal.includes('crcl_15_30') || cleanRenal.includes('中度')) {
    normRenal = 'CrCL_15_30';
  } else if (cleanRenal.includes('<15') || cleanRenal.includes('crcl_lt_15') || cleanRenal.includes('极重度') || cleanRenal === 'esrd') {
    normRenal = 'CrCL_lt_15';
  } else if (cleanRenal.includes('hd') || cleanRenal.includes('透析') || cleanRenal.includes('hemodialysis')) {
    normRenal = 'HD';
  } else {
    // Fallback if parsed from other strings
    normRenal = 'normal';
  }

  // Determine Adult Maximum Daily Dose limits for capping
  let adultMaxDailyDoseMg = 12000; // Normal adult max CFP/SBT: 12g (Sulbactam max 4g)
  if (normRenal === 'CrCL_15_30') {
    adultMaxDailyDoseMg = 6000;   // CrCL 15-30 adult max CFP/SBT: 6g (Sulbactam max 2g)
  } else if (normRenal === 'CrCL_lt_15' || normRenal === 'HD') {
    adultMaxDailyDoseMg = 3000;   // CrCL < 15 / HD adult max CFP/SBT: 3g (Sulbactam max 1g)
  }

  // Double block: combined hepatic and renal impairment restricts Cefoperazone max daily dose to 2g
  // 2g Cefoperazone corresponds to 3g of 2:1 CFP/SBT formulation
  if (hasHepaticImpairment && (normRenal === 'CrCL_15_30' || normRenal === 'CrCL_lt_15' || normRenal === 'HD')) {
    adultMaxDailyDoseMg = Math.min(adultMaxDailyDoseMg, 3000);
  }

  // --- ADULT CALCULATION ---
  if (isAdult) {
    let maintDoseMg = 0;
    let maintDoseLowMg = 1500;
    let maintDoseHighMg = 3000;
    let note = '';
    let frequency = 'q12h';
    let duration = '15 ~ 60 分钟';

    if (normRenal === 'normal') {
      maintDoseMg = isSevereInfection ? 6000 : 3000; // 6g q12h vs 3g q12h (could also be 1.5g q12h as low end)
      maintDoseLowMg = 1500;
      maintDoseHighMg = 3000;
      if (isSevereInfection) {
        note = '严重或难治性感染，剂量增至每日 12g (6.0g q12h)，已达每日舒巴坦上限 4.0g。';
      }
      if (hasHepaticImpairment) {
        note = (note ? note + ' ' : '') + '合并肝功能障碍/胆道梗阻：本品主要经胆汁排泄，半衰期延长。严重梗阻或肝病时需调整剂量并监测血清浓度。';
      }
    } else if (normRenal === 'CrCL_15_30') {
      // Max daily dose is 6g (3g q12h)
      maintDoseMg = isSevereInfection ? 3000 : 3000; // High end or severe is 3g q12h
      maintDoseLowMg = 1500;
      maintDoseHighMg = 3000;
      
      if (hasHepaticImpairment) {
        maintDoseMg = 1500; // Cap daily dose at 3g total (1.5g q12h)
        maintDoseLowMg = 1500;
        maintDoseHighMg = 1500;
        note = '⚠️ 肝肾联合损害警示：在未密切监测血药浓度的前提下，头孢哌酮每日最大剂量不应超过 2.0g。本品每日上限已保护性封顶至 3.0g (即 1.5g q12h)。';
      } else {
        note = '中度肾功能损害：每日舒巴坦最高剂量限制为 2g，故本品每日最高剂量为 6.0g (即 3.0g q12h)。若遇严重感染，可在此基础上人工评估是否单独增加头孢哌酮的用量。';
      }
    } else if (normRenal === 'CrCL_lt_15' || normRenal === 'HD') {
      // Max daily dose is 3g (1.5g q12h)
      maintDoseMg = 1500; // Max permitted
      maintDoseLowMg = 1500;
      maintDoseHighMg = 1500;

      if (normRenal === 'HD') {
        note = '血液透析患者：舒巴坦可被血透清除，头孢哌酮半衰期略微缩短。应在血液透析结束后给药一次（本品 1.5g q12h）。';
      } else {
        note = '重度肾功能损害：每日舒巴坦最高剂量限制为 1g，故本品每日最高剂量为 3.0g (即 1.5g q12h)。若遇严重感染，可在此基础上人工评估是否单独增加头孢哌酮的用量。';
      }

      if (hasHepaticImpairment) {
        note = '⚠️ 肝肾联合损害警示：' + (normRenal === 'HD' ? '血液透析且合并肝损' : '极重度肾损且合并肝损') + '。头孢哌酮每日最大剂量不应超过 2.0g，本品每日上限已封顶至 3.0g (1.5g q12h)。请密切监测血药浓度。';
      }
    }

    const totalDoseG = maintDoseMg / 1000;
    const cfpDoseMg = maintDoseMg * (2 / 3);
    const sbtDoseMg = maintDoseMg * (1 / 3);
    const drawVolumeMl = Number((maintDoseMg / 375).toFixed(1));

    let rangeText = '';
    if (maintDoseLowMg === maintDoseHighMg) {
      rangeText = `${(maintDoseLowMg / 1000).toFixed(1)}g`;
    } else {
      rangeText = `${(maintDoseLowMg / 1000).toFixed(1)}g ~ ${(maintDoseHighMg / 1000).toFixed(1)}g`;
    }

    const source = `注射用头孢哌酮钠舒巴坦钠说明书 (2024年04月版) - ${normRenal === 'normal' ? '【用法用量】成人用药' : '【用法用量】肾功能障碍患者的用药'}`;

    return {
      success: true,
      data: {
        isAdult: true,
        singleDoseMg: maintDoseMg,
        totalDoseG,
        cfpDoseMg,
        sbtDoseMg,
        drawVolumeMl,
        frequency,
        duration,
        rangeText,
        source,
        note
      }
    };
  }

  // --- PEDIATRIC CALCULATION ---
  else {
    // Pediatric weight check
    if (weightKg === undefined || weightKg === null || isNaN(weightKg) || weightKg <= 0) {
      return { success: false, error: '儿童体重必须为大于 0 的数值' };
    }
    if (weightKg < 0.5 || weightKg > 80) {
      return { success: false, error: '儿童计算体重推荐在 0.5 ~ 80 kg 范围以内' };
    }

    let frequency = 'q8h';
    let timesPerDay = 3;
    
    if (isNeonate1w) {
      frequency = 'q12h'; // Newborn <= 7 days is strictly q12h
      timesPerDay = 2;
    } else {
      frequency = pediatricFrequency;
      if (frequency === 'q6h') timesPerDay = 4;
      else if (frequency === 'q12h') timesPerDay = 2;
      else timesPerDay = 3; // Default q8h
    }

    let dailyDoseMg = 0;
    let dailyDoseLowMg = 30 * weightKg;
    let dailyDoseHighMg = 60 * weightKg;
    let isCapped = false;
    let isCappedLow = false;
    let isCappedHigh = false;

    if (isSevereInfection) {
      dailyDoseMg = 240 * weightKg; // Max severe dose is 240 mg/kg/day
      if (dailyDoseMg > adultMaxDailyDoseMg) {
        dailyDoseMg = adultMaxDailyDoseMg;
        isCapped = true;
      }
    } else {
      if (dailyDoseLowMg > adultMaxDailyDoseMg) {
        dailyDoseLowMg = adultMaxDailyDoseMg;
        isCappedLow = true;
      }
      if (dailyDoseHighMg > adultMaxDailyDoseMg) {
        dailyDoseHighMg = adultMaxDailyDoseMg;
        isCappedHigh = true;
      }
    }

    let singleDoseMg = 0;
    let singleDoseLowMg = 0;
    let singleDoseHighMg = 0;
    let drawVolumeMl = 0;
    let drawVolumeLowMl = 0;
    let drawVolumeHighMl = 0;
    let cfpDoseMg = 0;
    let sbtDoseMg = 0;

    if (isSevereInfection) {
      singleDoseMg = Number((dailyDoseMg / timesPerDay).toFixed(1));
      cfpDoseMg = Number((singleDoseMg * (2 / 3)).toFixed(1));
      sbtDoseMg = Number((singleDoseMg * (1 / 3)).toFixed(1));
      drawVolumeMl = Number((singleDoseMg / 375).toFixed(1));
    } else {
      singleDoseLowMg = Number((dailyDoseLowMg / timesPerDay).toFixed(1));
      singleDoseHighMg = Number((dailyDoseHighMg / timesPerDay).toFixed(1));
      drawVolumeLowMl = Number((singleDoseLowMg / 375).toFixed(1));
      drawVolumeHighMl = Number((singleDoseHighMg / 375).toFixed(1));
    }

    // Build warnings
    let notes = [];
    if (isNeonate1w) {
      notes.push('出生头一周新生儿：固定为每 12 小时给药一次 (q12h)。');
    }
    if (isCapped || isCappedLow || isCappedHigh) {
      notes.push('⚠️ 提示：计算出的儿童日剂量已超出对应患者状态下的成人最大推荐日剂量上限，已自动截断在成人安全剂量封顶值。');
    }
    if (normRenal !== 'normal') {
      notes.push('⚠️ 儿童肾损警示：说明书未提供单独儿童肾损调整表，计算器已引入成人肾损限额进行保护性封顶（CrCL 15-30: 舒巴坦每日上限 2g; CrCL < 15: 每日上限 1g）。请密切监视肾损患儿并咨询专科医师。');
    }
    if (hasHepaticImpairment) {
      notes.push('合并肝功能障碍：头孢哌酮主要经胆汁排泄。严重胆道梗阻或严重肝损时需密切监测，并评估减量。');
    }

    const totalDoseG = isSevereInfection ? Number((singleDoseMg / 1000).toFixed(4)) : null;
    const rangeText = isSevereInfection ? `${(singleDoseMg / 1000).toFixed(3)}g` : `${(singleDoseLowMg / 1000).toFixed(3)}g ~ ${(singleDoseHighMg / 1000).toFixed(3)}g`;
    const drawVolumeText = isSevereInfection ? `${drawVolumeMl} mL` : `${drawVolumeLowMl} ~ ${drawVolumeHighMl} mL`;

    const source = '注射用头孢哌酮钠舒巴坦钠说明书 (2024年04月版) - 【儿童用药】';

    return {
      success: true,
      data: {
        isAdult: false,
        isSevereInfection,
        singleDoseMg: isSevereInfection ? singleDoseMg : null,
        singleDoseLowMg: isSevereInfection ? null : singleDoseLowMg,
        singleDoseHighMg: isSevereInfection ? null : singleDoseHighMg,
        totalDoseG,
        cfpDoseMg: isSevereInfection ? cfpDoseMg : null,
        sbtDoseMg: isSevereInfection ? sbtDoseMg : null,
        drawVolumeMl: isSevereInfection ? drawVolumeMl : null,
        drawVolumeLowMl: isSevereInfection ? null : drawVolumeLowMl,
        drawVolumeHighMl: isSevereInfection ? null : drawVolumeHighMl,
        drawVolumeText,
        frequency,
        duration: '15 ~ 60 分钟',
        rangeText,
        source,
        note: notes.join(' ')
      }
    };
  }
}

if (isNode) {
  module.exports = { calculateDose, setRules };
} else {
  window.calculateDose = calculateDose;
  window.setRules = setRules;
}
