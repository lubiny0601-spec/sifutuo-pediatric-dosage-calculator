document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loadingOverlay = document.getElementById('loading_overlay');
  const loadingSpinner = document.getElementById('loading_spinner');
  const loadingText = document.getElementById('loading_text');
  const loadingError = document.getElementById('loading_error');

  const weightInput = document.getElementById('weight_input');
  const weightStepLabel = document.getElementById('weight_step_label');
  const prematureYes = document.getElementById('premature_yes');
  const prematureNo = document.getElementById('premature_no');
  const ageSelect = document.getElementById('age_group_select');
  const renalSelect = document.getElementById('renal_status_select');
  const renalStepLabel = document.getElementById('renal_step_label');
  const icuChk = document.getElementById('icu_chk');
  const icuToggleContainer = document.getElementById('icu_toggle_container');

  const patientPediatric = document.getElementById('patient_pediatric');
  const patientAdult = document.getElementById('patient_adult');
  const pediatricOnlyPremature = document.getElementById('pediatric_only_premature');
  const pediatricOnlyAge = document.getElementById('pediatric_only_age');

  const adultCgCalculator = document.getElementById('adult_cg_calculator');
  const cgToggleHeader = document.getElementById('cg_toggle_header');
  const cgToggleArrow = document.getElementById('cg_toggle_arrow');
  const cgFormBody = document.getElementById('cg_form_body');
  const cgAge = document.getElementById('cg_age');
  const cgGender = document.getElementById('cg_gender');
  const cgWeight = document.getElementById('cg_weight');
  const cgScr = document.getElementById('cg_scr');
  const cgScrUnit = document.getElementById('cg_scr_unit');
  const cgResultDisplay = document.getElementById('cg_result_display');
  const cgApplyBtn = document.getElementById('cg_apply_btn');

  const statusBadgeSuccess = document.getElementById('status_badge_success');
  const statusBadgeError = document.getElementById('status_badge_error');
  const doseSuccessPanel = document.getElementById('dose_success_panel');
  const doseErrorPanel = document.getElementById('dose_error_panel');

  const doseCeftazidime = document.getElementById('dose_ceftazidime');
  const doseAvibactam = document.getElementById('dose_avibactam');
  const doseFrequency = document.getElementById('dose_frequency');
  const doseDuration = document.getElementById('dose_duration');
  const errorText = document.getElementById('error_text');

  const checkWeight = document.getElementById('check_weight');
  const checkPremature = document.getElementById('check_premature');
  const checkAge = document.getElementById('check_age');
  const checkRenal = document.getElementById('check_renal');

  const icuWarningBanner = document.getElementById('icu_warning_banner');
  const specialWarningBanner = document.getElementById('special_warning_banner');
  const specialWarningText = document.getElementById('special_warning_text');

  const copyWechatBtn = document.getElementById('copy_wechat_btn');

  // App State
  let currentPatientType = 'pediatric'; // 'pediatric' or 'adult'
  let lastCalculatedData = null;

  // Age group choices mapping
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

  // Renal option choices mapping
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

  // Initialize age dropdown values
  function updateAgeDropdown(isPremature) {
    const options = isPremature ? AGE_OPTIONS_PREM : AGE_OPTIONS_TERM;
    ageSelect.innerHTML = '';
    
    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.text;
      if (opt.default) {
        optionEl.selected = true;
      }
      ageSelect.appendChild(optionEl);
    });
  }

  // Determine if patient requires infant-specific renal options (<3 months)
  function isInfantPatient() {
    if (currentPatientType === 'adult') return false;
    const isPremature = prematureYes.classList.contains('active');
    const ageVal = ageSelect.value;
    if (isPremature) return true;
    return ageVal === '出生-28天' || ageVal === '29天-3月龄';
  }

  // Initialize renal dropdown values dynamically
  function updateRenalDropdown() {
    let options = [];
    if (currentPatientType === 'adult') {
      options = RENAL_OPTIONS_ADULT;
      renalStepLabel.textContent = '第二步：选择患者肾功能状态 (eCrCL)';
    } else {
      const isInfant = isInfantPatient();
      options = isInfant ? RENAL_OPTIONS_BABY : RENAL_OPTIONS_CHILD;
      
      if (isInfant) {
        renalStepLabel.textContent = '第四步：确认婴儿肾损伤体征 (血肌酐)';
      } else {
        renalStepLabel.textContent = '第四步：勾选肾功能状态 (eCrCL)';
      }
    }

    const currentVal = renalSelect.value;
    renalSelect.innerHTML = '';
    
    let matched = false;
    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.text;
      if (opt.value === currentVal) {
        optionEl.selected = true;
        matched = true;
      }
      renalSelect.appendChild(optionEl);
    });

    if (!matched && options.length > 0) {
      const defaultOpt = options.find(o => o.default) || options[0];
      renalSelect.value = defaultOpt.value;
    }
  }

  // Load Rules Database
  async function initRules() {
    const paths = ['../data/rules.json', 'data/rules.json', '/data/rules.json'];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const rules = await response.json();
          window.setRules(rules);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to fetch rules from: ${path}`, e);
      }
    }
    throw new Error('All rule paths failed to load.');
  }

  // Calculate and Update UI Layout
  function calculateAndDisplay() {
    const weightKg = parseFloat(weightInput.value);
    const isPremature = prematureYes.classList.contains('active');
    const ageGroupOrPma = ageSelect.value;
    const renalStatus = renalSelect.value;
    const icuMode = icuChk.checked;
    const isAdult = currentPatientType === 'adult';

    // Output visual validations
    if (isAdult) {
      checkWeight.textContent = isNaN(weightKg) ? '未录入' : `${weightKg.toFixed(1)} kg`;
      checkPremature.textContent = '--';
      checkAge.textContent = '成人';
    } else {
      checkWeight.textContent = isNaN(weightKg) ? '-- kg' : `${weightKg.toFixed(1)} kg`;
      checkPremature.textContent = isPremature ? '是 (早产儿)' : '否 (足月儿)';
      
      // Map display label
      const selectedAgeText = ageSelect.options[ageSelect.selectedIndex] ? ageSelect.options[ageSelect.selectedIndex].text : '--';
      checkAge.textContent = selectedAgeText.split(' ')[0] || '--';
    }
    
    // Renal Display mapping
    const renalText = renalSelect.options[renalSelect.selectedIndex] 
      ? renalSelect.options[renalSelect.selectedIndex].text 
      : '--';
    checkRenal.textContent = renalText.split(' ')[0] || '--';

    // Call Engine logic
    const res = window.calculateDose({
      weightKg,
      isPremature,
      ageGroupOrPma,
      renalStatus,
      icuMode,
      isAdult
    });

    if (res.success) {
      // Show Success view
      doseSuccessPanel.style.display = 'block';
      doseErrorPanel.style.display = 'none';
      statusBadgeSuccess.style.display = 'flex';
      statusBadgeError.style.display = 'none';
      
      // Update UI with calculated values
      doseCeftazidime.textContent = res.data.doseCeftazidimeMg;
      doseAvibactam.textContent = res.data.doseAvibactamMg;
      
      // Format frequency display
      let freqDisplay = res.data.frequency;
      if (freqDisplay.toLowerCase() === 'q8h') freqDisplay = '每 8 小时一次';
      else if (freqDisplay.toLowerCase() === 'q12h') freqDisplay = '每 12 小时一次';
      else if (freqDisplay.toLowerCase() === 'q24h') freqDisplay = '每 24 小时一次';
      else if (freqDisplay.toLowerCase() === 'q48h') freqDisplay = '每 48 小时一次';
      doseFrequency.textContent = freqDisplay;
      doseDuration.textContent = res.data.duration;

      // Handle ICU warning (Children only)
      if (icuMode && !isAdult) {
        icuWarningBanner.style.display = 'block';
      } else {
        icuWarningBanner.style.display = 'none';
      }

      // Handle warnings
      let cleanNote = res.data.note || '';
      const icuNotePrefix = '重症患儿肾清除率极易快速波动，建议每日评估eCrCL并根据实时情况给药；密切观察液体平衡。';
      if (icuMode && cleanNote.startsWith(icuNotePrefix)) {
        cleanNote = cleanNote.replace(icuNotePrefix, '').trim();
      }
      
      if (cleanNote) {
        specialWarningText.textContent = cleanNote;
        specialWarningBanner.style.display = 'block';
      } else {
        specialWarningBanner.style.display = 'none';
      }

      // Enable WeChat copy button
      copyWechatBtn.removeAttribute('disabled');
      lastCalculatedData = res.data;
    } else {
      // Show error view
      doseSuccessPanel.style.display = 'none';
      doseErrorPanel.style.display = 'block';
      statusBadgeSuccess.style.display = 'none';
      statusBadgeError.style.display = 'flex';
      
      errorText.textContent = res.error || '无法计算，参数输入有误。';

      icuWarningBanner.style.display = 'none';
      specialWarningBanner.style.display = 'none';

      copyWechatBtn.setAttribute('disabled', 'true');
      lastCalculatedData = null;
    }
  }

  // WeChat copy trigger
  function copyToClipboard() {
    if (!lastCalculatedData) return;

    const weight = parseFloat(weightInput.value);
    const weightStr = isNaN(weight) ? '未录入' : `${weight}kg`;
    const isAdult = currentPatientType === 'adult';
    
    const age = isAdult ? '成人' : ageSelect.options[ageSelect.selectedIndex].text;
    const renal = renalSelect.options[renalSelect.selectedIndex].text;

    const copyText = `[思福妥® ${isAdult ? '成人' : '儿童'}抗感染剂量参考]\n` +
                     `患者信息：体重 ${weightStr} | 年龄 ${age} | 肾功能 ${renal}\n` +
                     `建议方案：头孢他啶 ${lastCalculatedData.doseCeftazidimeMg}mg + 阿维巴坦 ${lastCalculatedData.doseAvibactamMg}mg (单次总重 ${lastCalculatedData.totalDoseG}g)\n` +
                     `给药频次：${lastCalculatedData.frequency}，静脉滴注 ${lastCalculatedData.duration}\n` +
                     `数据来源：${lastCalculatedData.source}\n` +
                     `*仅供内部参考*`;

    navigator.clipboard.writeText(copyText).then(() => {
      const originalContent = copyWechatBtn.innerHTML;
      copyWechatBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        已复制成功
      `;
      copyWechatBtn.classList.add('copied');
      
      setTimeout(() => {
        copyWechatBtn.innerHTML = originalContent;
        copyWechatBtn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('复制失败，请尝试手动选中文本进行复制。');
    });
  }

  // Cockcroft-Gault eCrCL calculations
  function calculateCG() {
    const age = parseInt(cgAge.value);
    const gender = cgGender.value;
    const weight = parseFloat(cgWeight.value);
    const scr = parseFloat(cgScr.value);
    const unit = cgScrUnit.value;
    
    if (isNaN(age) || isNaN(weight) || isNaN(scr) || age <= 0 || weight <= 0 || scr <= 0) {
      cgResultDisplay.textContent = '--';
      cgApplyBtn.setAttribute('disabled', 'true');
      return null;
    }
    
    let scrMgDl = scr;
    if (unit === 'umol') {
      scrMgDl = scr / 88.4;
    }
    
    let crcl = ((140 - age) * weight) / (72 * scrMgDl);
    if (gender === 'female') {
      crcl *= 0.85;
    }
    
    cgResultDisplay.textContent = crcl.toFixed(1);
    cgApplyBtn.removeAttribute('disabled');
    return crcl;
  }

  // Event Listeners for CG Inputs
  [cgAge, cgWeight, cgScr].forEach(input => {
    input.addEventListener('input', calculateCG);
  });
  cgGender.addEventListener('change', calculateCG);
  cgScrUnit.addEventListener('change', calculateCG);

  // Toggle CG Body Expand/Collapse
  cgToggleHeader.addEventListener('click', () => {
    const isOpen = cgFormBody.style.display === 'block';
    cgFormBody.style.display = isOpen ? 'none' : 'block';
    cgToggleArrow.textContent = isOpen ? '展开' : '收起';
  });

  // Apply calculated CG value to renal select dropdown
  cgApplyBtn.addEventListener('click', () => {
    const crcl = calculateCG();
    if (crcl === null) return;
    
    let mappedVal = '';
    if (crcl > 50) {
      mappedVal = 'eCrCL > 50';
    } else if (crcl >= 31) {
      mappedVal = 'eCrCL 31-50';
    } else if (crcl >= 16) {
      mappedVal = 'eCrCL 16-30';
    } else if (crcl >= 6) {
      mappedVal = 'eCrCL 6-15';
    } else {
      mappedVal = 'ESRD';
    }
    
    renalSelect.value = mappedVal;
    calculateAndDisplay();
    
    // Close CG foldout
    cgFormBody.style.display = 'none';
    cgToggleArrow.textContent = '展开';
  });

  // Event Listeners for Dosing inputs
  weightInput.addEventListener('input', calculateAndDisplay);
  ageSelect.addEventListener('change', () => {
    updateRenalDropdown();
    calculateAndDisplay();
  });
  renalSelect.addEventListener('change', calculateAndDisplay);
  icuChk.addEventListener('change', calculateAndDisplay);

  icuToggleContainer.addEventListener('click', (e) => {
    if (e.target !== icuChk && e.target.tagName !== 'LABEL') {
      icuChk.checked = !icuChk.checked;
      calculateAndDisplay();
    }
  });

  // Pediatric toggles
  prematureYes.addEventListener('click', () => {
    if (!prematureYes.classList.contains('active')) {
      prematureYes.classList.add('active');
      prematureNo.classList.remove('active');
      updateAgeDropdown(true);
      updateRenalDropdown();
      calculateAndDisplay();
    }
  });

  prematureNo.addEventListener('click', () => {
    if (!prematureNo.classList.contains('active')) {
      prematureNo.classList.add('active');
      prematureYes.classList.remove('active');
      updateAgeDropdown(false);
      updateRenalDropdown();
      calculateAndDisplay();
    }
  });

  // Patient type Tab Toggling
  patientPediatric.addEventListener('click', () => {
    if (currentPatientType !== 'pediatric') {
      currentPatientType = 'pediatric';
      patientPediatric.classList.add('active');
      patientAdult.classList.remove('active');
      
      // Update form layouts
      pediatricOnlyPremature.style.display = 'block';
      pediatricOnlyAge.style.display = 'block';
      icuToggleContainer.style.display = 'flex';
      adultCgCalculator.style.display = 'none';
      
      weightStepLabel.textContent = '第一步：录入患者体重';
      weightInput.placeholder = '支持范围 0.5 - 80';
      if (parseFloat(weightInput.value) > 80 || isNaN(parseFloat(weightInput.value))) {
        weightInput.value = '12'; // Restore standard child default weight
      }

      updateAgeDropdown(prematureYes.classList.contains('active'));
      updateRenalDropdown();
      calculateAndDisplay();
    }
  });

  patientAdult.addEventListener('click', () => {
    if (currentPatientType !== 'adult') {
      currentPatientType = 'adult';
      patientAdult.classList.add('active');
      patientPediatric.classList.remove('active');
      
      // Update form layouts
      pediatricOnlyPremature.style.display = 'none';
      pediatricOnlyAge.style.display = 'none';
      icuToggleContainer.style.display = 'none';
      adultCgCalculator.style.display = 'block';
      
      weightStepLabel.textContent = '第一步：录入患者体重 (选填/辅助)';
      weightInput.placeholder = '成人剂量为固定值，体重可选填';
      if (parseFloat(weightInput.value) <= 12 || isNaN(parseFloat(weightInput.value))) {
        weightInput.value = '60'; // Standard adult default weight for CG
      }

      updateRenalDropdown();
      calculateAndDisplay();
    }
  });

  // WeChat copy trigger
  copyWechatBtn.addEventListener('click', copyToClipboard);

  // App Initialization
  updateAgeDropdown(false); // Default to full-term
  updateRenalDropdown();
  
  initRules().then(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
    // Run initial calculation with default inputs
    calculateAndDisplay();
  }).catch(err => {
    console.error('Rules loading failed:', err);
    loadingSpinner.style.display = 'none';
    loadingText.style.display = 'none';
    loadingError.style.display = 'block';
  });
});
