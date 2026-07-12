document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loading_overlay');
  const patientAge = document.getElementById('patient_age');
  const weightInput = document.getElementById('weight_input');
  const ecrclInput = document.getElementById('ecrcl_input');
  const renalReplacementTherapy = document.getElementById('renal_replacement_therapy');
  const infectionType = document.getElementById('infection_type');

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

  const statusBadgeSuccess = document.getElementById('status_badge_success');
  const statusBadgeError = document.getElementById('status_badge_error');
  const resultSuccessPanel = document.getElementById('result_success_panel');
  const resultErrorPanel = document.getElementById('result_error_panel');
  const doseLoadAtm = document.getElementById('dose_load_atm');
  const doseLoadAvi = document.getElementById('dose_load_avi');
  const drawLoadVol = document.getElementById('draw_load_vol');
  const doseMaintAtm = document.getElementById('dose_maint_atm');
  const doseMaintAvi = document.getElementById('dose_maint_avi');
  const drawMaintVol = document.getElementById('draw_maint_vol');
  const doseFrequency = document.getElementById('dose_frequency');
  const doseDuration = document.getElementById('dose_duration');
  const doseSource = document.getElementById('dose_source');
  const warningNoteContainer = document.getElementById('warning_note_container');
  const warningNoteText = document.getElementById('warning_note_text');
  const errorText = document.getElementById('error_text');
  const copyWechatBtn = document.getElementById('copy_wechat_btn');

  let currentGender = 'male';
  let lastCalculatedData = null;

  function showError(message) {
    lastCalculatedData = null;
    errorText.textContent = message;
    resultSuccessPanel.style.display = 'none';
    resultErrorPanel.style.display = 'block';
    statusBadgeSuccess.style.display = 'none';
    statusBadgeError.style.display = 'flex';
    copyWechatBtn.setAttribute('disabled', 'true');
  }

  function showCalculation(result) {
    lastCalculatedData = result.data;
    doseLoadAtm.innerHTML = `${result.data.loadAztreonamMg}<text class="unit">mg</text>`;
    doseLoadAvi.innerHTML = `${result.data.loadAvibactamMg}<text class="unit">mg</text>`;
    drawLoadVol.textContent = result.data.drawVolumeLoadMl;
    doseMaintAtm.innerHTML = `${result.data.maintAztreonamMg}<text class="unit">mg</text>`;
    doseMaintAvi.innerHTML = `${result.data.maintAvibactamMg}<text class="unit">mg</text>`;
    drawMaintVol.textContent = result.data.drawVolumeMaintMl;

    const frequencyMap = { q6h: '每 6 小时一次 (q6h)', q8h: '每 8 小时一次 (q8h)', q12h: '每 12 小时一次 (q12h)' };
    doseFrequency.textContent = frequencyMap[result.data.frequency] || result.data.frequency;
    doseDuration.textContent = result.data.duration;
    doseSource.textContent = result.data.source;
    warningNoteText.textContent = result.data.note;
    warningNoteContainer.style.display = result.data.note ? 'block' : 'none';
    resultSuccessPanel.style.display = 'block';
    resultErrorPanel.style.display = 'none';
    statusBadgeSuccess.style.display = 'flex';
    statusBadgeError.style.display = 'none';
    copyWechatBtn.removeAttribute('disabled');
  }

  function calculateAndDisplay() {
    const result = window.calculateDose({
      age: Number.parseInt(patientAge.value, 10),
      weightKg: Number.parseFloat(weightInput.value),
      eCrCL: Number.parseFloat(ecrclInput.value),
      renalReplacementTherapy: renalReplacementTherapy.value,
      infectionType: infectionType.value
    });

    if (result.success) {
      showCalculation(result);
    } else {
      showError(result.error);
    }
  }

  function calculateCG() {
    const age = Number.parseInt(cgAge.value || patientAge.value, 10);
    const weight = Number.parseFloat(cgWeight.value);
    const scr = Number.parseFloat(cgScr.value);
    if (!Number.isFinite(age) || !Number.isFinite(weight) || !Number.isFinite(scr) || age <= 0 || weight <= 0 || scr <= 0) {
      cgResultDisplay.textContent = '--';
      cgApplyBtn.setAttribute('disabled', 'true');
      return null;
    }

    const scrMgDl = cgScrUnit.value === 'umol' ? scr / 88.4 : scr;
    let crcl = ((140 - age) * weight) / (72 * scrMgDl);
    if (currentGender === 'female') crcl *= 0.85;
    cgResultDisplay.textContent = crcl.toFixed(1);
    cgApplyBtn.removeAttribute('disabled');
    return crcl;
  }

  async function initRules() {
    const loadedRules = await window.loadSifunuoRules(window.fetch.bind(window), window.validateRules);
    if (!window.setRules(loadedRules)) {
      throw new Error('加载的规则不是 ATM-AVI 剂量规则。');
    }
  }

  function copyToClipboard() {
    if (!lastCalculatedData) return;
    const therapyLabel = renalReplacementTherapy.options[renalReplacementTherapy.selectedIndex].text;
    const infectionLabel = infectionType.options[infectionType.selectedIndex].text;
    const text = `[思福诺® 成人给药剂量参考]\n`
      + `患者信息：${patientAge.value} 岁 | 体重 ${weightInput.value || '未录入'} kg | eCrCL ${ecrclInput.value} mL/min\n`
      + `肾脏替代治疗：${therapyLabel} | 感染类型：${infectionLabel}\n`
      + `负荷剂量：氨曲南 ${lastCalculatedData.loadAztreonamMg}mg + 阿维巴坦 ${lastCalculatedData.loadAvibactamMg}mg（抽取 ${lastCalculatedData.drawVolumeLoadMl}mL）\n`
      + `维持剂量：氨曲南 ${lastCalculatedData.maintAztreonamMg}mg + 阿维巴坦 ${lastCalculatedData.maintAvibactamMg}mg（${lastCalculatedData.frequency}，抽取 ${lastCalculatedData.drawVolumeMaintMl}mL）\n`
      + `输注时间：静脉滴注 ${lastCalculatedData.duration}\n`
      + `备注：${lastCalculatedData.note}\n*仅供内部参考*`;
    navigator.clipboard.writeText(text).then(() => {
      copyWechatBtn.classList.add('copied');
      setTimeout(() => copyWechatBtn.classList.remove('copied'), 2000);
    }).catch(() => alert('复制失败，请手动选中文本进行复制。'));
  }

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
  cgToggleHeader.addEventListener('click', () => {
    const isOpen = cgFormBody.style.display === 'block';
    cgFormBody.style.display = isOpen ? 'none' : 'block';
    cgToggleArrow.textContent = isOpen ? '展开' : '收起';
    if (!isOpen && cgWeight.value === '' && weightInput.value !== '') cgWeight.value = weightInput.value;
    if (!isOpen && cgAge.value === '' && patientAge.value !== '') cgAge.value = patientAge.value;
    calculateCG();
  });
  cgApplyBtn.addEventListener('click', () => {
    const crcl = calculateCG();
    if (crcl === null) return;
    if (cgAge.value !== '') patientAge.value = cgAge.value;
    if (cgWeight.value !== '' && weightInput.value === '') weightInput.value = cgWeight.value;
    ecrclInput.value = crcl.toFixed(1);
    calculateAndDisplay();
    cgFormBody.style.display = 'none';
    cgToggleArrow.textContent = '展开';
  });

  [patientAge, weightInput, ecrclInput, cgAge, cgWeight, cgScr].forEach((element) => {
    element.addEventListener('input', () => {
      calculateCG();
      calculateAndDisplay();
    });
  });
  [renalReplacementTherapy, infectionType].forEach((element) => element.addEventListener('change', calculateAndDisplay));
  cgScrUnit.addEventListener('change', calculateCG);
  copyWechatBtn.addEventListener('click', copyToClipboard);

  resultSuccessPanel.style.display = 'none';
  resultErrorPanel.style.display = 'none';
  statusBadgeSuccess.style.display = 'none';
  statusBadgeError.style.display = 'none';
  copyWechatBtn.setAttribute('disabled', 'true');

  initRules().then(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 300);
    showError('请完整填写年龄、eCrCL、肾脏替代治疗方式和感染类型后计算。');
  }).catch((error) => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 300);
    showError(`规则加载失败：${error.message}`);
  });
});
