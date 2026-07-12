(function exposeRulesLoader(globalScope) {
  async function loadRules(fetchImpl, validateRules) {
    const response = await fetchImpl('data/rules.json');
    if (!response.ok) {
      throw new Error('无法加载思福诺剂量规则。');
    }

    const loadedRules = await response.json();
    if (!validateRules(loadedRules)) {
      throw new Error('加载的规则不是 ATM-AVI 剂量规则。');
    }

    return loadedRules;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadRules };
  } else {
    globalScope.loadSifunuoRules = loadRules;
  }
}(typeof window !== 'undefined' ? window : globalThis));
