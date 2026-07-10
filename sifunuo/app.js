document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loadingOverlay = document.getElementById('loading_overlay');
  const weightInput = document.getElementById('weight_input');
  const renalSelect = document.getElementById('renal_select');

  // CG Calculator Elements
  const cgToggleHeader = document.getElementById('cg_toggle_header');
  const cgToggleArrow = document.getElementById('cg_toggle_arrow');
  const cgFormBody = document.getElementById('cg_form_body');
  const cgAge = document.getElementById('cg_age');
  const cgWeight = document.getElementById('cg_weight');
  const cgScr = document.getElementById('cg_scr');
  const cgScrUnit = document.getElementById('cg_scr_unit');
  const cgResultDisplay = document.getElementById('cg_result_display');
  const cgApplyBtn = document.getElementById('cg_apply_btn');
  const genderMale = document.getElementById('gender_male');
  const genderFemale = document.getElementById('gender_female');

  // Result Elements
  const statusBadgeSuccess = document.getElementById('status_badge_success');
  const statusBadgeError = document.getElementById('status_badge_error');
  const resultSuccessPanel = document.getElementById('result_success_panel');
  const resultErrorPanel = document.getElementById('result_error_panel');

  const recommendationValue = document.getElementById('recommendation_value');
  const doseFrequency = document.getElementById('dose_frequency');
  const doseDuration = document.getElementById('dose_duration');
  const doseSource = document.getElementById('dose_source');
  const warningNoteContainer = document.getElementById('warning_note_container');
  const warningNoteText = document.getElementById('warning_note_text');
  const errorText = document.getElementById('error_text');

  const copyWechatBtn = document.getElementById('copy_wechat_btn');

  // Active state variables
  let currentGender = 'male';
  let lastCalculatedData = null;

  // Initialize rules
  async function initRules() {
    const paths = ['../data/rules.json', 'data/rules.json', '/data/rules.json'];
    for (const path of paths) {
      try {
        const cacheBuster = `?v=${new Date().getTime()}`;
        const response = await fetch(path + cacheBuster);
        if (response.ok) {
          const rules = await response.json();
          window.setRules(rules);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to fetch rules from: ${path}`, e);
      }
    }
    // Fallback if local rules are loaded directly
    return true;
  }

  // Perform calculations and update UI layout
  function calculateAndDisplay() {
    const weightKg = parseFloat(weightInput.value);
    const renalStatus = renalSelect.value;

    const res = window.calculateDose({
      weightKg: isNaN(weightKg) ? null : weightKg,
      isAdult: true,
      isPremature: false,
      ageGroupOrPma: '成人',
      renalStatus,
      icuMode: false
    });

    if (res.success) {
      lastCalculatedData = res.data;

      // Update UI texts (Convert mg to g representation)
      const doseG = res.data.doseCeftazidimeMg / 1000;
      recommendationValue.textContent = `${doseG.toFixed(2)} g (${res.data.doseCeftazidimeMg} mg)`;

      // Frequency label mapping
      let freqDisplay = res.data.frequency;
      if (freqDisplay.toLowerCase() === 'q8h') freqDisplay = '每 8 小时一次 (q8h)';
      else if (freqDisplay.toLowerCase() === 'q12h') freqDisplay = '每 12 小时一次 (q12h)';
      else if (freqDisplay.toLowerCase() === 'q24h') freqDisplay = '每 24 小时一次 (q24h)';
      else if (freqDisplay.toLowerCase() === 'q48h') freqDisplay = '每 48 小时一次 (q48h)';
      
      doseFrequency.textContent = freqDisplay;
      doseDuration.textContent = '30 ~ 60 分钟';
      
      // Update data source (Customize to Sifunuo)
      doseSource.textContent = `思福诺® (注射用头孢他啶) 说明书 【用法用量】 (2025年版)`;

      // Warnings
      if (res.data.note) {
        warningNoteText.textContent = res.data.note;
        warningNoteContainer.style.display = 'block';
      } else {
        warningNoteContainer.style.display = 'none';
      }

      // Display toggle
      resultSuccessPanel.style.display = 'block';
      resultErrorPanel.style.display = 'none';
      statusBadgeSuccess.style.display = 'flex';
      statusBadgeError.style.display = 'none';
      copyWechatBtn.removeAttribute('disabled');
    } else {
      lastCalculatedData = null;
      errorText.textContent = res.error;

      resultSuccessPanel.style.display = 'none';
      resultErrorPanel.style.display = 'block';
      statusBadgeSuccess.style.display = 'none';
      statusBadgeError.style.display = 'flex';
      copyWechatBtn.setAttribute('disabled', 'true');
    }
  }

  // Cockcroft-Gault Calculations
  function calculateCG() {
    const age = parseInt(cgAge.value);
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
    if (currentGender === 'female') {
      crcl *= 0.85;
    }

    cgResultDisplay.textContent = crcl.toFixed(1);
    cgApplyBtn.removeAttribute('disabled');
    return crcl;
  }

  // Event handlers for CG Gender Buttons
  genderMale.addEventListener('click', () => {
    currentGender = 'male';
    genderMale.classList.add('active');
    genderFemale.classList.remove('active');
    calculateCG();
  });

  genderFemale.addEventListener('click', () => {
    currentGender = 'female';
    genderFemale.classList.add('active');
    genderMale.classList.remove('active');
    calculateCG();
  });

  // Toggle CG Collapse
  cgToggleHeader.addEventListener('click', () => {
    const isOpen = cgFormBody.style.display === 'block';
    cgFormBody.style.display = isOpen ? 'none' : 'block';
    cgToggleArrow.textContent = isOpen ? '展开' : '收起';
    
    // Auto-populate weight into CG if available
    if (!isOpen && !isNaN(parseFloat(weightInput.value)) && cgWeight.value === '') {
      cgWeight.value = weightInput.value;
      calculateCG();
    }
  });

  // Copy Results to Clipboard
  function copyToClipboard() {
    if (!lastCalculatedData) return;

    const wVal = parseFloat(weightInput.value);
    const weightStr = isNaN(wVal) ? '未录入' : `${wVal}kg`;
    const renalText = renalSelect.options[renalSelect.selectedIndex].text.split(' ')[0];

    const copyText = `[思福诺® (注射用头孢他啶) 成人剂量计算参考]\n` +
                     `患者信息：体重 ${weightStr} | 肾功能 ${renalText}\n` +
                     `推荐剂量：单次给药 ${recommendationValue.textContent}\n` +
                     `给药频次：${doseFrequency.textContent}\n` +
                     `输注时间：静脉滴注 ${doseDuration.textContent}\n` +
                     `数据来源：思福诺® 说明书\n` +
                     `*仅供内部参考*`;

    navigator.clipboard.writeText(copyText).then(() => {
      copyWechatBtn.classList.add('copied');
      setTimeout(() => {
        copyWechatBtn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('复制失败，请手动选中文本进行复制。');
    });
  }

  // CG Apply Action
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
    
    // Auto fill weight from CG back to main weight if not set
    if (cgWeight.value !== '' && weightInput.value === '') {
      weightInput.value = cgWeight.value;
    }

    calculateAndDisplay();

    // Close CG foldout
    cgFormBody.style.display = 'none';
    cgToggleArrow.textContent = '展开';
  });

  // Watch inputs
  [cgAge, cgWeight, cgScr, weightInput].forEach(el => {
    el.addEventListener('input', () => {
      calculateCG();
      calculateAndDisplay();
    });
  });
  cgScrUnit.addEventListener('change', () => {
    calculateCG();
    calculateAndDisplay();
  });
  renalSelect.addEventListener('change', calculateAndDisplay);
  copyWechatBtn.addEventListener('click', copyToClipboard);

  // App Init
  initRules().then(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
    calculateAndDisplay();
  }).catch(err => {
    console.error('Rules loading failed:', err);
    const spinner = loadingOverlay.querySelector('.spinner');
    if (spinner) spinner.style.display = 'none';
    loadingOverlay.querySelector('div').textContent = '⚠️ 加载规则失败，请刷新重试。';
  });
});
