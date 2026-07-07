# 思福妥® 儿童抗感染剂量计算工具 (Pediatric Dosage Calculator)

本工具是专为儿科、ICU 医药代表及医学事务团队（MA/MSL）设计的移动端 H5 剂量计算与决策辅助工具。基于思福妥®（注射用头孢他啶阿维巴坦钠）官方说明书与剂量卡开发，旨在帮助专业人员在医院弱网或离线拜访场景下，快速、准确地查询并验证儿科患儿的静脉滴注剂量。

👉 **[在线演示与使用链接](https://lubiny0601-spec.github.io/sifutuo-pediatric-dosage-calculator/src/index.html)**

---

## 🌟 核心功能特性

* **20条儿科规则精准匹配**：完美支持早产儿（纠正胎龄 PMA 26-30周、31-44周、45-52周）及足月儿（按日龄、月龄划分）在正常与不同肾功能损伤状态下的用法用量匹配。
* **确定性剂量封顶 (Max Cap)**：根据患儿肾清除率级别，自动与说明书成人单次给药上限（如正常肾功单次上限 2.0g/0.5g）进行比对截断，防止超说明书超量用药。
* **高风险边界拦截**：
  * 对 3 月龄以下伴有肾损伤的新生儿进行拦截并抛出红牌安全警告（说明书提示数据不足）。
  * 对 2 岁以下伴有重度肾功能损伤（eCrCL < 16）或进行透析的患儿进行拦截警告。
* **微信一键复制机制**：计算完毕后可一键复制规范化的沟通备忘文本，便于代表与医学事务人员沟通。
* **ICU 重症监护警示模式**：可选开启，针对 ICU 重症患儿提示动态监测肾清除率与液体出入量平衡。
* **零服务器依赖**：纯前端本地计算引擎（0毫秒延迟），完美适应信号差的病房及院内场景，数据完全本地运行，100% 保护患者隐私。
* **极简自适应美学 (Impeccable & Feel Better)**：同心圆角（20px 卡片 / 10px 控件）、层叠卡片阴影、下沉式触感反馈（active:scale-[0.96]）以及数值等宽排版（tabular-nums）。

---

## 📁 目录结构说明

```
├── data/
│   └── rules.json          # 编译后的静态 JSON 剂量规则库
├── docs/
│   └── superpowers/specs/  # 开发设计规约说明书 (Spec)
├── src/
│   ├── index.html          # 高保真 H5 界面层
│   ├── app.js              # 前端交互与绑定层
│   └── engine.js           # 确定性儿科剂量计算与安全拦截引擎 (ESM & Node.js 兼容)
├── tests/
│   └── engine.test.js      # 基于 Node.js 原生 Test Runner 的 8 项单元测试套件
├── compile.js              # 将 Excel 规则编译为 JSON 的工具脚本
├── migrate_gemini.bat      # Antigravity 缓存目录一键迁移至 D 盘工具 (Windows)
└── package.json            # 依赖包及测试脚本配置
```

---

## 🛠️ 技术路线与运行验证

本系统采用静态编译与客户端运行解耦的架构：

### 1. 运行测试套件
在本地开发环境下，可直接运行基于 Node 26+ 内置 Runner 的单元测试：
```bash
npm test
# 或运行
node --test tests/engine.test.js
```

### 2. 重新编译规则 Excel
如果未来说明书或剂量卡数据发生更新，可以直接在 `药品规则数据模板_思福妥_思福诺.xlsx` 中修改，然后运行编译脚本重新生成规则 JSON：
```bash
node compile.js
```

---

## 📲 移动端 H5 容器集成指引

### 1. 微信小程序 WebView 嵌入
在小程序中直接新建页面并使用 `<web-view>` 组件载入：
```xml
<!-- pages/calculator/calculator.wxml -->
<web-view src="https://lubiny0601-spec.github.io/sifutuo-pediatric-dosage-calculator/src/index.html"></web-view>
```
*注：请在微信小程序后台将 `lubiny0601-spec.github.io` 添加到“业务域名”授信白名单中。*

### 2. 企业 CRM 移动端 H5 集成
直接将该 H5 公网链接配置为 CRM App 拜访模块的内置跳转子菜单。系统已对手机视口（375px ~ 430px）进行全面自适应布局，能无缝全屏嵌入。

---

## ⚖️ 免责声明
本工具仅作为医药代表及医学信息事务人员的学术整理辅助工具。临床实际给药决策必须由主治医生结合患儿具体临床状态最终负责。
