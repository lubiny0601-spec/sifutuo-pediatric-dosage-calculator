// index.js
const { calculateDose } = require('../../utils/engine.js');

// Constants for Dropdowns
const RENAL_OPTIONS = [
  { text: 'eCrCL > 50 mL/min (正常或轻度损害)', value: 'eCrCL > 50' },
  { text: 'eCrCL 31 ~ 50 mL/min (中度损害)', value: 'eCrCL 31-50' },
  { text: 'eCrCL 16 ~ 30 mL/min (重度损害)', value: 'eCrCL 16-30' },
  { text: 'eCrCL 6 ~ 15 mL/min (极重度损害且血液透析)', value: 'eCrCL 6-15' },
  { text: 'eCrCL ≤ 15 mL/min 且未血液透析 (不推荐使用)', value: 'ESRD' },
  { text: 'CRRT / 腹膜透析 (数据不足)', value: 'CRRT' }
];

Page({
  data: {
    isAdult: true, // ATM-AVI is strictly for adults
    weight: '',
    renalOptions: RENAL_OPTIONS,
    renalIndex: 0,
    calcResult: null,

    // CG Calculator states
    cgCollapsed: true,
    cgAge: '',
    cgGender: 'male',
    cgScr: '',
    scrUnits: ['μmol/L', 'mg/dL'],
    scrUnitIndex: 0,
    cgResult: null
  },

  onLoad() {
    this.calculateAndDisplay();
  },

  // Event handlers
  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    }, () => {
      this.calculateAndDisplay();
      // Auto compute CG if open
      if (!this.data.cgCollapsed) {
        this.runCgCalculation();
      }
    });
  },

  onRenalChange(e) {
    this.setData({
      renalIndex: parseInt(e.detail.value)
    }, () => {
      this.calculateAndDisplay();
    });
  },

  // Core calculation linkage
  calculateAndDisplay() {
    const { weight, renalOptions, renalIndex } = this.data;
    const weightKg = parseFloat(weight);

    const renalStatus = renalOptions[renalIndex].value;

    const res = calculateDose({
      weightKg: isNaN(weightKg) ? null : weightKg,
      isAdult: true,
      renalStatus
    });

    if (res.success) {
      // Map frequency display labels
      let frequencyText = res.data.frequency;
      if (frequencyText.toLowerCase() === 'q6h') frequencyText = '每 6 小时一次 (q6h)';
      else if (frequencyText.toLowerCase() === 'q8h') frequencyText = '每 8 小时一次 (q8h)';
      else if (frequencyText.toLowerCase() === 'q12h') frequencyText = '每 12 小时一次 (q12h)';

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
        // Auto-populate weight into CG if available
        if (this.data.weight !== '' && this.data.cgWeight === '') {
          this.runCgCalculation();
        }
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
    } else {
      renalIndex = 3; // Default to dialysis since <15 without dialysis is blocked
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
    const { calcResult, weight, renalOptions, renalIndex } = this.data;
    if (!calcResult || !calcResult.success) return;

    const wVal = parseFloat(weight);
    const weightStr = isNaN(wVal) ? '未录入' : `${wVal}kg`;
    const renal = renalOptions[renalIndex].text.split(' ')[0];

    const copyText = `[注射用氨曲南阿维巴坦钠 成人给药剂量参考]\n` +
                     `患者信息：体重 ${weightStr} | 肾功能 ${renal}\n` +
                     `负荷剂量：氨曲南 ${calcResult.data.loadAztreonamMg}mg + 阿维巴坦 ${calcResult.data.loadAvibactamMg}mg (抽吸复溶溶液 ${calcResult.data.drawVolumeLoadMl}mL)\n` +
                     `维持剂量：氨曲南 ${calcResult.data.maintAztreonamMg}mg + 阿维巴坦 ${calcResult.data.maintAvibactamMg}mg (维持频次 ${calcResult.data.frequencyText}，抽吸复溶溶液 ${calcResult.data.drawVolumeMaintMl}mL)\n` +
                     `输注时间：静脉滴注 ${calcResult.data.duration}\n` +
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
