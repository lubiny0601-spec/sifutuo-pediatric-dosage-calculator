document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loadingOverlay = document.getElementById('loading_overlay');
  const weightInput = document.getElementById('weight_input');
  const weightLabelNote = document.getElementById('weight_label_note');
  const renalSelect = document.getElementById('renal_select');
  const renalSelectGroup = document.getElementById('renal_select_group');
  const cgPanelContainer = document.getElementById('cg_panel_container');
  const pediatricControls = document.getElementById('pediatric_controls');
  
  // Tabs
  const tabAdult = document.getElementById('tab_adult');
  const tabPediatric = document.getElementById('tab_pediatric');
  
  // Checkboxes & Selects
  const neonateCheckbox = document.getElementById('neonate_checkbox');
  const pediatricFrequencySelect = document.getElementById('pediatric_frequency_select');
  const pedFreqGroup = document.getElementById('ped_freq_group');
  const hepaticCheckbox = document.getElementById('hepatic_checkbox');
  const severeCheckbox = document.getElementById('severe_checkbox');
  const addonStepBadge = document.getElementById('addon_step_badge');

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

  const recommendationTitle = document.getElementById('recommendation_title');
  const recommendationValue = document.getElementById('recommendation_value');
  const drawVolumeValue = document.getElementById('draw_volume_value');
  
  const cfpComponentValue = document.getElementById('cfp_component_value');
  const sbtComponentValue = document.getElementById('sbt_component_value');

  const doseFrequency = document.getElementById('dose_frequency');
  const doseDuration = document.getElementById('dose_duration');
  const doseSource = document.getElementById('dose_source');
  const warningNoteContainer = document.getElementById('warning_note_container');
  const warningNoteText = document.getElementById('warning_note_text');
  const errorText = document.getElementById('error_text');

  const copyWechatBtn = document.getElementById('copy_wechat_btn');

  // Active state variables
  let isAdult = true;
  let currentGender = 'male';
  let lastCalculatedData = null;

  // Initialize rules (simulate loading, though we are working local)
  async function initRules() {
    // In H5 app, rules are parsed from rules.json or loaded locally
    const paths = ['../data/rules.json', 'data/rules.json', '/data/rules.json'];
    for (const path of paths) {
      try {
        const cacheBuster = `?v=${new Date().getTime()}`;
        const response = await fetch(path + cacheBuster);
        if (response.ok) {
          const rulesData = await response.json();
          window.setRules(rulesData);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to fetch rules from: ${path}`, e);
      }
    }
    // Fallback in case fetch fails
    return true;
  }

  // Tab switching logic
  tabAdult.addEventListener('click', () => {
    if (isAdult) return;
    isAdult = true;
    tabAdult.classList.add('active');
    tabPediatric.classList.remove('active');
    
    // UI adjustment
    renalSelectGroup.style.display = 'flex';
    cgPanelContainer.style.display = 'block';
    pediatricControls.style.display = 'none';
    weightLabelNote.textContent = '(选填/辅助, kg)';
    addonStepBadge.textContent = '3';
    
    calculateAndDisplay();
  });

  tabPediatric.addEventListener('click', () => {
    if (!isAdult) return;
    isAdult = false;
    tabPediatric.classList.add('active');
    tabAdult.classList.remove('active');
    
    // UI adjustment
    renalSelectGroup.style.display = 'none';
    cgPanelContainer.style.display = 'none';
    pediatricControls.style.display = 'flex';
    weightLabelNote.textContent = '(必填, kg)';
    addonStepBadge.textContent = '4';
    
    calculateAndDisplay();
  });

  // Neonate checkbox change
  neonateCheckbox.addEventListener('change', () => {
    if (neonateCheckbox.checked) {
      pediatricFrequencySelect.value = 'q12h';
      pediatricFrequencySelect.setAttribute('disabled', 'true');
      pedFreqGroup.style.opacity = '0.5';
    } else {
      pediatricFrequencySelect.removeAttribute('disabled');
      pedFreqGroup.style.opacity = '1';
    }
    calculateAndDisplay();
  });

  // Perform calculations and update UI layout
  function calculateAndDisplay() {
    const weightKg = parseFloat(weightInput.value);
    const renalStatus = isAdult ? renalSelect.value : 'normal';

    const res = window.calculateDose({
      isAdult,
      weightKg: isNaN(weightKg) ? null : weightKg,
      renalStatus,
      hasHepaticImpairment: hepaticCheckbox.checked,
      isSevereInfection: severeCheckbox.checked,
      isNeonate1w: !isAdult && neonateCheckbox.checked,
      pediatricFrequency: pediatricFrequencySelect.value
    });

    if (res.success) {
      lastCalculatedData = res.data;

      // Update basic values
      recommendationValue.textContent = res.data.rangeText;
      
      if (isAdult) {
        recommendationTitle.textContent = '推荐给药剂量 (单次)';
        drawVolumeValue.innerHTML = `<strong>${res.data.drawVolumeMl}</strong> mL`;
        
        if (severeCheckbox.checked) {
          cfpComponentValue.textContent = `${(res.data.cfpDoseMg / 1000).toFixed(1)} g`;
          sbtComponentValue.textContent = `${(res.data.sbtDoseMg / 1000).toFixed(1)} g`;
        } else {
          // Standard adult range
          const cleanRenal = renalStatus.replace(/\s+/g, '').toLowerCase();
          if (cleanRenal.includes('<15') || cleanRenal.includes('hd')) {
            cfpComponentValue.textContent = `1.0 g`;
            sbtComponentValue.textContent = `0.5 g`;
          } else if (cleanRenal.includes('15-30') && hepaticCheckbox.checked) {
            cfpComponentValue.textContent = `1.0 g`;
            sbtComponentValue.textContent = `0.5 g`;
          } else {
            cfpComponentValue.textContent = `1.0 g ~ 2.0 g`;
            sbtComponentValue.textContent = `0.5 g ~ 1.0 g`;
          }
        }
      } else {
        recommendationTitle.textContent = '儿童推荐给药剂量 (单次)';
        drawVolumeValue.innerHTML = `<strong>${res.data.drawVolumeText.replace(' mL', '')}</strong> mL`;
        
        if (severeCheckbox.checked) {
          cfpComponentValue.textContent = `${res.data.cfpDoseMg.toFixed(1)} mg`;
          sbtComponentValue.textContent = `${res.data.sbtDoseMg.toFixed(1)} mg`;
        } else {
          const cfpLow = (res.data.singleDoseLowMg * 2 / 3).toFixed(1);
          const cfpHigh = (res.data.singleDoseHighMg * 2 / 3).toFixed(1);
          const sbtLow = (res.data.singleDoseLowMg / 3).toFixed(1);
          const sbtHigh = (res.data.singleDoseHighMg / 3).toFixed(1);
          cfpComponentValue.textContent = `${cfpLow} ~ ${cfpHigh} mg`;
          sbtComponentValue.textContent = `${sbtLow} ~ ${sbtHigh} mg`;
        }
      }

      // Frequency label mapping
      let freqDisplay = res.data.frequency;
      if (freqDisplay.toLowerCase() === 'q6h') freqDisplay = '每 6 小时一次 (q6h)';
      else if (freqDisplay.toLowerCase() === 'q8h') freqDisplay = '每 8 小时一次 (q8h)';
      else if (freqDisplay.toLowerCase() === 'q12h') freqDisplay = '每 12 小时一次 (q12h)';
      doseFrequency.textContent = freqDisplay;

      doseDuration.textContent = res.data.duration;
      doseSource.textContent = res.data.source;

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
      statusBadgeSuccess.querySelector('span:nth-child(2)').textContent = '计算成功';
      statusBadgeError.style.display = 'none';
      copyWechatBtn.removeAttribute('disabled');
    } else {
      lastCalculatedData = null;
      errorText.textContent = res.error;

      resultSuccessPanel.style.display = 'none';
      resultErrorPanel.style.display = 'block';
      statusBadgeSuccess.style.display = 'none';
      statusBadgeError.style.display = 'flex';
      statusBadgeError.querySelector('span:nth-child(2)').textContent = '计算有误';
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
    
    let infoStr = `[注射用头孢哌酮钠舒巴坦钠 剂量计算参考]\n` +
                  `患者分类：${isAdult ? '成人' : '儿童'}\n` +
                  `体重信息：${weightStr}\n`;
                  
    if (isAdult) {
      const renalText = renalSelect.options[renalSelect.selectedIndex].text;
      infoStr += `肾功能 (eCrCL)：${renalText}\n`;
    }
    
    infoStr += `推荐剂量：单次给药 ${lastCalculatedData.rangeText} (头孢哌酮：${cfpComponentValue.textContent}，舒巴坦：${sbtComponentValue.textContent})\n` +
               `复溶抽吸：需抽取复溶溶液 ${drawVolumeValue.textContent.trim()}\n` +
               `给药频次：${doseFrequency.textContent}\n` +
               `给药时间：静脉滴注 ${lastCalculatedData.duration}\n` +
               `数据来源：${lastCalculatedData.source}\n`;
               
    if (lastCalculatedData.note) {
      infoStr += `医学备注：${lastCalculatedData.note}\n`;
    }
    
    infoStr += `*仅供医护人员内部参考*`;

    navigator.clipboard.writeText(infoStr).then(() => {
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
    if (crcl > 30) {
      mappedVal = 'eCrCL > 30';
    } else if (crcl >= 15) {
      mappedVal = 'CrCL 15-30';
    } else {
      mappedVal = 'CrCL < 15';
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
      if (el === weightInput && !isAdult) {
        // Link main weight to CG weight in child mode (though CG is hidden, keeps clean)
        cgWeight.value = weightInput.value;
      }
      calculateCG();
      calculateAndDisplay();
    });
  });
  
  cgScrUnit.addEventListener('change', () => {
    calculateCG();
    calculateAndDisplay();
  });
  
  renalSelect.addEventListener('change', calculateAndDisplay);
  hepaticCheckbox.addEventListener('change', calculateAndDisplay);
  severeCheckbox.addEventListener('change', calculateAndDisplay);
  pediatricFrequencySelect.addEventListener('change', calculateAndDisplay);
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
