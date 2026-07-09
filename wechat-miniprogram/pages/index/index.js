// index.js
const { calculateDose } = require('../../utils/engine.js');

// Constants for Dropdowns
const AGE_OPTIONS_TERM = [
  { text: '出生 ~ 28天 (足月新生儿)', value: '出生-28天' },
  { text: '29天 ~ <3月龄', value: '29天-3月龄' },
  { text: '3月龄 ~ <6月龄', value: '3-6月龄' },
  { text: '6月龄 ~ <2岁', value: '6月龄-2岁', default: true },
  { text: '2岁 ~ 18岁', value: '2-18岁' }
];

const AGE_OPTIONS_PREM = [
  { text: 'PMA 26 ~ <31周', value: 'PMA 26-30周' },
  { text: 'PMA 31 ~ <45周', value: 'PMA 31-44周', default: true },
  { text: 'PMA 45 ~ <53周', value: 'PMA 45 ~ <53周' }
];

const RENAL_OPTIONS_BABY = [
  { text: '血肌酐未超过同年龄正常值上限 (正常)', value: 'eCrCL > 50', default: true },
  { text: '血肌酐超过同年龄正常值上限 (有肾损体征)', value: 'eCrCL <= 50' }
];

const RENAL_OPTIONS_CHILD = [
  { text: 'eCrCL > 50 mL/min/1.73m² (正常或轻度受损)', value: 'eCrCL > 50', default: true },
  { text: 'eCrCL 31 ~ 50 mL/min/1.73m² (中度受损)', value: 'eCrCL 31-50' },
  { text: 'eCrCL 16 ~ 30 mL/min/1.73m² (中重度受损)', value: 'eCrCL 16-30' },
  { text: 'eCrCL 6 ~ 15 mL/min/1.73m² (重度受损)', value: 'eCrCL 6-15' },
  { text: 'ESRD (终末期肾病/血液透析)', value: 'ESRD' }
];

const RENAL_OPTIONS_ADULT = [
  { text: 'eCrCL > 50 mL/min (正常或轻度受损)', value: 'eCrCL > 50', default: true },
  { text: 'eCrCL 31 ~ 50 mL/min (中度受损)', value: 'eCrCL 31-50' },
  { text: 'eCrCL 16 ~ 30 mL/min (重度受损)', value: 'eCrCL 16-30' },
  { text: 'eCrCL 6 ~ 15 mL/min (极重度受损)', value: 'eCrCL 6-15' },
  { text: 'ESRD (终末期肾病/血液透析, eCrCL < 6)', value: 'ESRD' }
];

Page({
  data: {
    isAdult: false,
    weight: '',
    isPremature: false,
    ageOptions: AGE_OPTIONS_TERM,
    ageIndex: 3, // Defaults to '6月龄 ~ <2岁'
    renalOptions: RENAL_OPTIONS_CHILD,
    renalIndex: 0, // Defaults to 'eCrCL > 50'
    icuMode: false,
    isInfant: false,
    calcResult: null,

    // CG Calculator states (adult)
    cgCollapsed: true,
    cgAge: '',
    cgGender: 'male',
    cgScr: '',
    scrUnits: ['μmol/L', 'mg/dL'],
    scrUnitIndex: 0,
    cgResult: null
  },

  onLoad() {
    this.updateAgeDropdown(false);
    this.updateRenalDropdown();
    this.calculateAndDisplay();
  },

  // Switch patient category Tab
  switchPatientType(e) {
    const type = e.currentTarget.dataset.type;
    const isAdult = type === 'adult';
    
    if (this.data.isAdult !== isAdult) {
      let weight = this.data.weight;
      if (isAdult) {
        // Adult default weight to 60 if empty or too small
        const wVal = parseFloat(weight);
        if (isNaN(wVal) || wVal <= 12) {
          weight = '60';
        }
      }

      this.setData({
        isAdult,
        weight,
        renalIndex: 0 // Reset renal status select
      }, () => {
        this.updateRenalDropdown();
        this.calculateAndDisplay();
      });
    }
  },

  // Set Premature state
  setPremature(e) {
    const isPremature = e.currentTarget.dataset.val === 'true';
    if (this.data.isPremature !== isPremature) {
      this.setData({
        isPremature
      }, () => {
        this.updateAgeDropdown(isPremature);
        this.updateRenalDropdown();
        this.calculateAndDisplay();
      });
    }
  },

  // Update Age options dynamically
  updateAgeDropdown(isPremature) {
    const ageOptions = isPremature ? AGE_OPTIONS_PREM : AGE_OPTIONS_TERM;
    const defaultIndex = ageOptions.findIndex(opt => opt.default) || 0;
    this.setData({
      ageOptions,
      ageIndex: defaultIndex
    });
  },

  // Check if patient is infant (<3 months)
  isInfantPatient() {
    if (this.data.isAdult) return false;
    if (this.data.isPremature) return true;
    const ageVal = this.data.ageOptions[this.data.ageIndex].value;
    return ageVal === '出生-28天' || ageVal === '29天-3月龄';
  },

  // Dynamic Renal Dropdown Options
  updateRenalDropdown() {
    let renalOptions = [];
    let isInfant = false;

    if (this.data.isAdult) {
      renalOptions = RENAL_OPTIONS_ADULT;
    } else {
      isInfant = this.isInfantPatient();
      renalOptions = isInfant ? RENAL_OPTIONS_BABY : RENAL_OPTIONS_CHILD;
    }

    // Keep renal index valid
    let renalIndex = this.data.renalIndex;
    if (renalIndex >= renalOptions.length) {
      renalIndex = 0;
    }

    this.setData({
      renalOptions,
      renalIndex,
      isInfant
    });
  },

  // Event handlers
  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    }, () => {
      this.calculateAndDisplay();
      // Auto compute CG if open
      if (this.data.isAdult && !this.data.cgCollapsed) {
        this.runCgCalculation();
      }
    });
  },

  onAgeChange(e) {
    this.setData({
      ageIndex: parseInt(e.detail.value)
    }, () => {
      this.updateRenalDropdown();
      this.calculateAndDisplay();
    });
  },

  onRenalChange(e) {
    this.setData({
      renalIndex: parseInt(e.detail.value)
    }, () => {
      this.calculateAndDisplay();
    });
  },

  onIcuChange(e) {
    this.setData({
      icuMode: e.detail.value
    }, () => {
      this.calculateAndDisplay();
    });
  },

  // Core calculation linkage
  calculateAndDisplay() {
    const { isAdult, weight, isPremature, ageOptions, ageIndex, renalOptions, renalIndex, icuMode } = this.data;
    const weightKg = parseFloat(weight);

    // Stop calculation if pediatric weight is empty/invalid
    if (!isAdult && (isNaN(weightKg) || weightKg <= 0)) {
      this.setData({ calcResult: null });
      return;
    }

    const ageGroupOrPma = isAdult ? '成人' : ageOptions[ageIndex].value;
    const renalStatus = renalOptions[renalIndex].value;

    const res = calculateDose({
      weightKg,
      isPremature,
      ageGroupOrPma,
      renalStatus,
      icuMode,
      isAdult
    });

    if (res.success) {
      // Map frequency display labels
      let frequencyText = res.data.frequency;
      if (frequencyText.toLowerCase() === 'q8h') frequencyText = '每 8 小时一次 (q8h)';
      else if (frequencyText.toLowerCase() === 'q12h') frequencyText = '每 12 小时一次 (q12h)';
      else if (frequencyText.toLowerCase() === 'q24h') frequencyText = '每 24 小时一次 (q24h)';
      else if (frequencyText.toLowerCase() === 'q48h') frequencyText = '每 48 小时一次 (q48h)';

      res.data.frequencyText = frequencyText;
    }

    this.setData({ calcResult: res });
  },

  // Toggle CG Collapse
  toggleCgCollapse() {
    this.setData({
      cgCollapsed: !this.data.cgCollapsed
    }, () => {
      if (!this.data.cgCollapsed) {
        this.runCgCalculation();
      }
    });
  },

  onCgAgeInput(e) {
    this.setData({ cgAge: e.detail.value }, () => this.runCgCalculation());
  },

  setCgGender(e) {
    this.setData({ cgGender: e.currentTarget.dataset.val }, () => this.runCgCalculation());
  },

  onCgScrInput(e) {
    this.setData({ cgScr: e.detail.value }, () => this.runCgCalculation());
  },

  onScrUnitChange(e) {
    this.setData({ scrUnitIndex: parseInt(e.detail.value) }, () => this.runCgCalculation());
  },

  // Run Cockcroft-Gault calculation
  runCgCalculation() {
    const { cgAge, weight, cgGender, cgScr, scrUnits, scrUnitIndex } = this.data;
    const age = parseInt(cgAge);
    const w = parseFloat(weight);
    const scr = parseFloat(cgScr);
    const unit = scrUnits[scrUnitIndex];

    if (isNaN(age) || isNaN(w) || isNaN(scr) || age <= 0 || w <= 0 || scr <= 0) {
      this.setData({ cgResult: null });
      return null;
    }

    let scrMgDl = scr;
    if (unit === 'μmol/L') {
      scrMgDl = scr / 88.4;
    }

    let crcl = ((140 - age) * w) / (72 * scrMgDl);
    if (cgGender === 'female') {
      crcl *= 0.85;
    }

    this.setData({
      cgResult: Number(crcl.toFixed(1))
    });
    return crcl;
  },

  // Apply CG value and collapse CG panel
  calculateAndApplyCg() {
    const crcl = this.runCgCalculation();
    if (crcl === null) {
      wx.showToast({
        title: '请输入完整CG参数',
        icon: 'none'
      });
      return;
    }

    // Map CrCl to Adult Renal Status index
    let renalIndex = 0;
    if (crcl > 50) {
      renalIndex = 0;
    } else if (crcl >= 31) {
      renalIndex = 1;
    } else if (crcl >= 16) {
      renalIndex = 2;
    } else if (crcl >= 6) {
      renalIndex = 3;
    } else {
      renalIndex = 4;
    }

    this.setData({
      renalIndex,
      cgCollapsed: true
    }, () => {
      this.calculateAndDisplay();
      wx.showToast({
        title: `已应用 eCrCL: ${crcl.toFixed(1)}`,
        icon: 'success'
      });
    });
  },

  // Copy Results to clipboard
  copyResults() {
    const { calcResult, isAdult, weight, ageOptions, ageIndex, renalOptions, renalIndex } = this.data;
    if (!calcResult || !calcResult.success) return;

    const wVal = parseFloat(weight);
    const weightStr = isNaN(wVal) ? '未录入' : `${wVal}kg`;
    const age = isAdult ? '成人' : ageOptions[ageIndex].text.split(' ')[0];
    const renal = renalOptions[renalIndex].text.split(' ')[0];

    const copyText = `[思福妥® ${isAdult ? '成人' : '儿童'}抗感染剂量参考]\n` +
                     `患者信息：体重 ${weightStr} | 年龄 ${age} | 肾功能 ${renal}\n` +
                     `建议方案：头孢他啶 ${calcResult.data.doseCeftazidimeMg}mg + 阿维巴坦 ${calcResult.data.doseAvibactamMg}mg (单次总重 ${calcResult.data.totalDoseG}g)\n` +
                     `给药频次：${calcResult.data.frequencyText}，静脉滴注 ${calcResult.data.duration}\n` +
                     `数据来源：${calcResult.data.source}\n` +
                     `*仅供内部参考*`;

    wx.setClipboardData({
      data: copyText,
      success() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  }
});
