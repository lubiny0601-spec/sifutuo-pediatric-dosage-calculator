document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loadingOverlay = document.getElementById('loading_overlay');
  const loadingSpinner = document.getElementById('loading_spinner');
  const loadingText = document.getElementById('loading_text');
  const loadingError = document.getElementById('loading_error');

  const weightInput = document.getElementById('weight_input');
  const prematureYes = document.getElementById('premature_yes');
  const prematureNo = document.getElementById('premature_no');
  const ageSelect = document.getElementById('age_group_select');
  const renalSelect = document.getElementById('renal_status_select');
  const icuChk = document.getElementById('icu_chk');
  const icuToggleContainer = document.getElementById('icu_toggle_container');

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
  let lastCalculatedData = null;

  // Age group choices mapping
  const AGE_OPTIONS_TERM = [
    { text: '出生 ~ 28天', value: '出生 ~ 28天' },
    { text: '29天 ~ <3月龄', value: '29天 ~ <3月龄' },
    { text: '3月龄 ~ <6月龄', value: '3月龄 ~ <6月龄' },
    { text: '6月龄 ~ <2岁', value: '6月龄 ~ <2岁', default: true },
    { text: '2岁 ~ <18岁', value: '2岁 ~ <18岁' }
  ];

  const AGE_OPTIONS_PREM = [
    { text: 'PMA 26-30周', value: 'PMA 26-30周' },
    { text: 'PMA 31-44周', value: 'PMA 31-44周', default: true },
    { text: 'PMA >44-52周', value: 'PMA >44-52周' }
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

    // Output visual validations
    checkWeight.textContent = isNaN(weightKg) ? '-- kg' : `${weightKg.toFixed(1)} kg`;
    checkPremature.textContent = isPremature ? '是 (早产儿)' : '否 (足月儿)';
    checkAge.textContent = ageGroupOrPma || '--';
    
    // Use the user-facing text for check summary (clean out value tags)
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
      icuMode
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
      
      // Format frequency display (e.g. q8h -> 每 8 小时一次)
      let freqDisplay = res.data.frequency;
      if (freqDisplay.toLowerCase() === 'q8h') freqDisplay = '每 8 小时一次';
      else if (freqDisplay.toLowerCase() === 'q12h') freqDisplay = '每 12 小时一次';
      else if (freqDisplay.toLowerCase() === 'q24h') freqDisplay = '每 24 小时一次';
      else if (freqDisplay.toLowerCase() === 'q48h') freqDisplay = '每 48 小时一次';
      doseFrequency.textContent = freqDisplay;
      doseDuration.textContent = res.data.duration;

      // Handle warnings
      if (icuMode) {
        icuWarningBanner.style.display = 'block';
      } else {
        icuWarningBanner.style.display = 'none';
      }

      // Extract specific clinical special warnings (removing standard ICU note)
      const icuNotePrefix = '重症患儿肾清除率极易快速波动，建议每日评估eCrCL并根据实时情况给药；密切观察液体平衡。';
      let cleanNote = res.data.note || '';
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

      // Hide optional warning indicators on calculation fail
      icuWarningBanner.style.display = 'none';
      specialWarningBanner.style.display = 'none';

      // Disable WeChat copy button
      copyWechatBtn.setAttribute('disabled', 'true');
      lastCalculatedData = null;
    }
  }

  // WeChat communicate template format
  function generateCopyText(weight, age, renal, resData) {
    return `[思福妥® 儿童抗感染剂量参考]\n` +
           `患者信息：体重 ${weight}kg | 年龄 ${age} | 肾功能 ${renal}\n` +
           `建议方案：头孢他啶 ${resData.doseCeftazidimeMg}mg + 阿维巴坦 ${resData.doseAvibactamMg}mg (单次总重 ${resData.totalDoseG}g)\n` +
           `给给药频次：${resData.frequency}，静脉滴注 ${resData.duration}\n` +
           `数据来源：${resData.source}\n` +
           `*仅供内部参考*`;
  }
  // Wait, let's fix the typo in the copy template from the brief:
  // "给药频次" instead of "给给药频次". The brief has:
  // `给药频次：${resData.frequency}，静脉滴注 ${resData.duration}\n`
  // So let's use:
  // `给药频次：${resData.frequency}，静脉滴注 ${resData.duration}\n`

  function copyToClipboard() {
    if (!lastCalculatedData) return;

    const weight = parseFloat(weightInput.value);
    const age = ageSelect.value;
    const renal = renalSelect.options[renalSelect.selectedIndex].text;

    const copyText = `[思福妥® 儿童抗感染剂量参考]\n` +
                     `患者信息：体重 ${weight}kg | 年龄 ${age} | 肾功能 ${renal}\n` +
                     `建议方案：头孢他啶 ${lastCalculatedData.doseCeftazidimeMg}mg + 阿维巴坦 ${lastCalculatedData.doseAvibactamMg}mg (单次总重 ${lastCalculatedData.totalDoseG}g)\n` +
                     `给药频次：${lastCalculatedData.frequency}，静脉滴注 ${lastCalculatedData.duration}\n` +
                     `数据来源：${lastCalculatedData.source}\n` +
                     `*仅供内部参考*`;

    navigator.clipboard.writeText(copyText).then(() => {
      // Toggle button visual state
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

  // Event Listeners
  weightInput.addEventListener('input', calculateAndDisplay);
  ageSelect.addEventListener('change', calculateAndDisplay);
  renalSelect.addEventListener('change', calculateAndDisplay);
  icuChk.addEventListener('change', calculateAndDisplay);

  // ICU Switch container click wrapper
  icuToggleContainer.addEventListener('click', (e) => {
    // Avoid double trigger if clicking label/checkbox directly
    if (e.target !== icuChk && e.target.tagName !== 'LABEL') {
      icuChk.checked = !icuChk.checked;
      calculateAndDisplay();
    }
  });

  // Premature toggle buttons click listener
  prematureYes.addEventListener('click', () => {
    if (!prematureYes.classList.contains('active')) {
      prematureYes.classList.add('active');
      prematureNo.classList.remove('active');
      updateAgeDropdown(true);
      calculateAndDisplay();
    }
  });

  prematureNo.addEventListener('click', () => {
    if (!prematureNo.classList.contains('active')) {
      prematureNo.classList.add('active');
      prematureYes.classList.remove('active');
      updateAgeDropdown(false);
      calculateAndDisplay();
    }
  });

  // WeChat copy trigger
  copyWechatBtn.addEventListener('click', copyToClipboard);

  // App Initialization
  updateAgeDropdown(false); // Default to full-term
  
  initRules().then(() => {
    // Fade out loading screen smoothly
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
