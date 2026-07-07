const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '药品规则数据模板_思福妥_思福诺.xlsx');
const outputPath = path.join(__dirname, 'data', 'rules.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const wb = xlsx.readFile(excelPath);
const drugRules = xlsx.utils.sheet_to_json(wb.Sheets['药品规则模板']);
const renalRules = xlsx.utils.sheet_to_json(wb.Sheets['肾功能调整模板']);

const compiled = {
  drugs: drugRules,
  renal: renalRules,
  compiledAt: new Date().toISOString()
};

fs.writeFileSync(outputPath, JSON.stringify(compiled, null, 2), 'utf8');
console.log("Rules compiled successfully to data/rules.json");
