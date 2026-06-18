/**
 * templates.js - 简历模板系统
 * 定义多套简历模板的渲染函数和样式
 */

// ============================================================
// 色彩主题定义
// ============================================================
const ColorThemes = {
    navy: {
        name: '经典深蓝',
        headerBg: 'linear-gradient(135deg, #1e293b, #334155)',
        headerText: '#ffffff',
        accent: '#3b82f6',
        accentLight: '#dbeafe',
        sectionBorder: '#1e293b',
        titleColor: '#1e293b',
        subColor: '#3b82f6',
        textColor: '#334155',
        lightBg: '#f8fafc',
        borderColor: '#e2e8f0',
        skillBg: '#f1f5f9',
        skillBorder: '#e2e8f0',
    },
    emerald: {
        name: '翡翠绿',
        headerBg: 'linear-gradient(135deg, #064e3b, #059669)',
        headerText: '#ffffff',
        accent: '#059669',
        accentLight: '#d1fae5',
        sectionBorder: '#059669',
        titleColor: '#064e3b',
        subColor: '#059669',
        textColor: '#374151',
        lightBg: '#f0fdf4',
        borderColor: '#d1fae5',
        skillBg: '#ecfdf5',
        skillBorder: '#a7f3d0',
    },
    rose: {
        name: '玫瑰红',
        headerBg: 'linear-gradient(135deg, #881337, #e11d48)',
        headerText: '#ffffff',
        accent: '#e11d48',
        accentLight: '#ffe4e6',
        sectionBorder: '#e11d48',
        titleColor: '#881337',
        subColor: '#e11d48',
        textColor: '#374151',
        lightBg: '#fff1f2',
        borderColor: '#fecdd3',
        skillBg: '#fff1f2',
        skillBorder: '#fecdd3',
    },
    amber: {
        name: '琥珀橙',
        headerBg: 'linear-gradient(135deg, #78350f, #d97706)',
        headerText: '#ffffff',
        accent: '#d97706',
        accentLight: '#fef3c7',
        sectionBorder: '#d97706',
        titleColor: '#78350f',
        subColor: '#d97706',
        textColor: '#374151',
        lightBg: '#fffbeb',
        borderColor: '#fde68a',
        skillBg: '#fffbeb',
        skillBorder: '#fde68a',
    },
    sky: {
        name: '天空蓝',
        headerBg: 'linear-gradient(135deg, #0c4a6e, #0284c7)',
        headerText: '#ffffff',
        accent: '#0284c7',
        accentLight: '#e0f2fe',
        sectionBorder: '#0284c7',
        titleColor: '#0c4a6e',
        subColor: '#0284c7',
        textColor: '#374151',
        lightBg: '#f0f9ff',
        borderColor: '#bae6fd',
        skillBg: '#f0f9ff',
        skillBorder: '#bae6fd',
    },
    slate: {
        name: '石墨灰',
        headerBg: 'linear-gradient(135deg, #0f172a, #475569)',
        headerText: '#ffffff',
        accent: '#475569',
        accentLight: '#f1f5f9',
        sectionBorder: '#475569',
        titleColor: '#0f172a',
        subColor: '#475569',
        textColor: '#374151',
        lightBg: '#f8fafc',
        borderColor: '#cbd5e1',
        skillBg: '#f1f5f9',
        skillBorder: '#cbd5e1',
    },
};

const Templates = {
    // 模板注册表
    registry: {},

    /**
     * 注册一个模板
     * @param {string} id - 模板唯一标识
     * @param {string} name - 模板显示名称
     * @param {Function} renderer - 渲染函数 (data) => HTML string
     * @param {string} extraCSS - 模板专属 CSS
     */
    register(id, name, renderer, extraCSS) {
        this.registry[id] = { id, name, renderer, extraCSS };
    },

    /**
     * 获取模板
     * @param {string} id
     */
    get(id) {
        return this.registry[id] || this.registry['classic'];
    },

    /**
     * 渲染简历
     * @param {string} templateId - 模板 ID
     * @param {Object} data - 简历数据
     * @returns {string} HTML 字符串
     */
    render(templateId, data, themeId, fontFamily, textColor) {
        const tmpl = this.get(templateId);
        const mainHTML = tmpl.renderer(data, themeId);
        const extraCSS = tmpl.extraCSS || '';
        const baseCSS = this.getBaseCSS();
        const hasFont = !!fontFamily;
        const hasColor = !!textColor;
        let globalStyle = '';
        let extraClasses = '';
        if (hasFont || hasColor) {
            const vars = [];
            if (hasFont) vars.push(`--global-font: ${fontFamily};`);
            if (hasColor) vars.push(`--global-text-color: ${textColor};`);
            // 声明 CSS 变量在根元素
            const varRule = `.resume-template.gf-gc{${vars.join('')}}`;
            // 字体: 强制覆盖所有元素（安全，不影响布局）
            const fontOverride = hasFont
                ? `.resume-template.gf-gc,.resume-template.gf-gc *{font-family:var(--global-font) !important}`
                : '';
            // 文字颜色: 精确覆盖各模板的文字元素，保留侧边栏/头部设计色
            const colorRules = hasColor ? [
                `.resume-template.gf-gc{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .desc-text{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .item-title,.resume-template.gf-gc .item-subtitle{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .classic-name,.resume-template.gf-gc .classic-title,.resume-template.gf-gc .classic-contact span{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .pro-entry-title,.resume-template.gf-gc .pro-entry-sub,.resume-template.gf-gc .pro-section-title,.resume-template.gf-gc .pro-skill-text{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .modern-entry-title,.resume-template.gf-gc .modern-entry-company,.resume-template.gf-gc .modern-main-title{color:var(--global-text-color) !important}`,
                `.resume-template.gf-gc .section-title,.resume-template.gf-gc .skill-tag-text,.resume-template.gf-gc .date-range,.resume-template.gf-gc .pro-entry-date{color:var(--global-text-color) !important}`,
            ] : [];
            const allRules = [varRule, fontOverride, ...colorRules].filter(Boolean);
            globalStyle = `<style>${allRules.join('\n')}</style>`;
            extraClasses = ' gf-gc';
        }
        return `${globalStyle}<style>${baseCSS}\n${extraCSS}</style><div class="resume-template tmpl-${templateId}${extraClasses}">${mainHTML}</div>`;
    },

    /**
     * 获取所有模板列表
     */
    getList() {
        return Object.values(this.registry).map(t => ({ id: t.id, name: t.name }));
    },

    /**
     * 基础 CSS — 所有模板共享的排版样式
     */
    getBaseCSS() {
        return `
            .resume-template {
                font-family: var(--global-font, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif);
                color: var(--global-text-color, #333);
                line-height: 1.6;
                padding: 0;
            }
            .resume-template h1, .resume-template h2, .resume-template h3 {
                margin: 0;
                line-height: 1.4;
            }
            .resume-template ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .resume-template p {
                margin: 0;
            }
            .resume-template a {
                text-decoration: none;
            }
            .resume-template .section-title {
                font-size: 16px;
                font-weight: 700;
                padding-bottom: 6px;
                margin-bottom: 12px;
                border-bottom: 2px solid;
            }
            .resume-template .date-range {
                font-size: 13px;
                color: #888;
            }
            .resume-template .desc-text {
                font-size: 13px;
                color: #555;
                white-space: pre-wrap;
            }
            /* ===== 自定义模块共享样式 ===== */
            .resume-template .cs-section-title {
                font-size: 16px;
                font-weight: 700;
                padding-bottom: 6px;
                margin-bottom: 12px;
                border-bottom: 2px solid #e0e7ff;
                color: #1e293b;
            }
            .resume-template .cs-field-row {
                margin-bottom: 3px;
                font-size: 13px;
                color: #555;
                white-space: pre-wrap;
                line-height: 1.6;
            }
            .resume-template .cs-field-label {
                font-weight: 600;
                color: #334155;
                margin-right: 6px;
            }
        `;
    },

    /**
     * 渲染自定义模块章节（通用，会被所有模板使用）
     * @param {Array} customSections
     * @param {string} cssPrefix - 模板 CSS 前缀（如 'classic-'）
     * @param {Object} theme - 可选配色主题
     * @returns {string} HTML
     */
    renderCustomSections(customSections, cssPrefix, theme) {
        if (!customSections || customSections.length === 0) return '';
        const accentColor = theme?.accent || '#4f46e5';
        const borderColor = theme?.accentLight || '#e0e7ff';
        const titleColor = theme?.titleColor || '#1e293b';
        const textColor = theme?.textColor || '#555';

        return customSections.map(section => {
            const entries = section.entries || [];
            const fields = section.fields || [];
            if (entries.length === 0) return '';

            return `
            <div class="${cssPrefix}section cs-section">
                <h2 class="${cssPrefix}section-title cs-section-title" style="border-bottom-color:${borderColor};color:${titleColor}">🧩 ${section.title || '自定义'}</h2>
                ${entries.map(entry => `
                <div class="${cssPrefix}item cs-field-row">
                    ${fields.map(f => {
                        const val = entry[f.name] || '';
                        if (!val) return '';
                        // 如果字段名很短，显示标签
                        if (f.label && f.label.length <= 6 && fields.length > 1) {
                            return `<div><span class="cs-field-label">${f.label}：</span>${val}</div>`;
                        }
                        return `<div>${val}</div>`;
                    }).filter(s => s).join('')}
                </div>
                `).join('')}
            </div>`;
        }).join('');
    }
};

// ============================================================
// 模板 1: 简约经典 (classic)
// ============================================================
Templates.register('classic', '简约经典', (data) => {
    const d = data || {};
    const personal = d.personal || {};
    const education = d.education || [];
    const experience = d.experience || [];
    const skills = d.skills || [];
    const projects = d.projects || [];
    const customSections = d.customSections || [];

    return `
        <div class="classic-resume">
            <!-- 头部 -->
            <div class="classic-header">
                <div class="classic-header-main">
                    ${personal.avatar ? `<div class="classic-avatar"><img src="${personal.avatar}" alt="头像"></div>` : ''}
                    <div class="classic-header-info">
                        <h1 class="classic-name">${personal.name || '你的姓名'}</h1>
                        <div class="classic-title">${personal.title || '求职意向'}</div>
                    </div>
                </div>
                <div class="classic-contact">
                    ${personal.phone ? `<span>📞 ${personal.phone}</span>` : ''}
                    ${personal.email ? `<span>✉️ ${personal.email}</span>` : ''}
                    ${personal.location ? `<span>📍 ${personal.location}</span>` : ''}
                </div>
            </div>

            <!-- 个人简介 -->
            ${personal.summary ? `
            <div class="classic-section">
                <h2 class="section-title">📌 个人简介</h2>
                <p class="desc-text">${personal.summary}</p>
            </div>` : ''}

            <!-- 工作经历 -->
            ${experience.length > 0 ? `
            <div class="classic-section">
                <h2 class="section-title">💼 工作经历</h2>
                ${experience.map(exp => `
                <div class="classic-item">
                    <div class="classic-item-header">
                        <div>
                            <span class="item-title">${exp.position || ''}</span>
                            <span class="item-subtitle">${exp.company ? `@ ${exp.company}` : ''}</span>
                        </div>
                        <span class="date-range">${exp.startDate || ''} — ${exp.endDate || '至今'}</span>
                    </div>
                    ${exp.description ? `<p class="desc-text">${exp.description}</p>` : ''}
                </div>
                `).join('')}
            </div>` : ''}

            <!-- 教育经历 -->
            ${education.length > 0 ? `
            <div class="classic-section">
                <h2 class="section-title">🎓 教育经历</h2>
                ${education.map(edu => `
                <div class="classic-item">
                    <div class="classic-item-header">
                        <div>
                            <span class="item-title">${edu.school || ''}</span>
                            <span class="item-subtitle">${edu.major || ''} · ${edu.degree || ''}</span>
                        </div>
                        <span class="date-range">${edu.startDate || ''} — ${edu.endDate || '至今'}</span>
                    </div>
                    ${edu.description ? `<p class="desc-text">${edu.description}</p>` : ''}
                </div>
                `).join('')}
            </div>` : ''}

            <!-- 项目经历 -->
            ${projects.length > 0 ? `
            <div class="classic-section">
                <h2 class="section-title">🚀 项目经历</h2>
                ${projects.map(proj => `
                <div class="classic-item">
                    <div class="classic-item-header">
                        <div>
                            <span class="item-title">${proj.name || ''}</span>
                            <span class="item-subtitle">${proj.role ? `(${proj.role})` : ''}</span>
                        </div>
                        <span class="date-range">${proj.startDate || ''} — ${proj.endDate || '至今'}</span>
                    </div>
                    ${proj.description ? `<p class="desc-text">${proj.description}</p>` : ''}
                    ${proj.link ? `<p class="desc-text" style="margin-top:4px;">🔗 <a href="${proj.link}" target="_blank">${proj.link}</a></p>` : ''}
                </div>
                `).join('')}
            </div>` : ''}

            <!-- 专业技能 -->
            ${skills.length > 0 ? `
            <div class="classic-section">
                <h2 class="section-title">🔧 专业技能</h2>
                <div class="classic-skills">
                    ${skills.map(s => `
                    <span class="skill-tag-text">${s.name || ''}</span>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- 自定义模块 -->
            ${Templates.renderCustomSections(customSections, 'classic-')}

        </div>
    `;
}, `
    /* 简约经典 专属样式 */
    .classic-resume { padding: 40px 44px; }
    .classic-header { margin-bottom: 24px; }
    .classic-header-main { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 12px; }
    .classic-avatar { flex-shrink: 0; }
    .classic-avatar img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #e0e7ff; }
    .classic-name { font-size: 28px; font-weight: 700; color: #1e293b; }
    .classic-title { font-size: 16px; color: #4f46e5; margin-top: 4px; font-weight: 500; }
    .classic-contact { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #64748b; }
    .classic-contact span { display: inline-flex; align-items: center; gap: 4px; }
    .classic-section { margin-bottom: 20px; }
    .classic-section .section-title { color: #1e293b; border-bottom-color: #e0e7ff; }
    .classic-item { margin-bottom: 14px; }
    .classic-item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; flex-wrap: wrap; gap: 4px; }
    .item-title { font-size: 15px; font-weight: 600; color: #1e293b; }
    .item-subtitle { font-size: 14px; color: #64748b; margin-left: 6px; }
    .classic-skills { display: flex; flex-wrap: wrap; gap: 6px 16px; }
    .skill-tag-text { font-size: 14px; font-weight: 500; color: #334155; }
`);

// ============================================================
// 模板 2: 现代清新 (modern) — 支持色彩主题
// ============================================================
Templates.register('modern', '现代清新', (data, themeId) => {
    const d = data || {};
    const personal = d.personal || {};
    const education = d.education || [];
    const experience = d.experience || [];
    const skills = d.skills || [];
    const projects = d.projects || [];
    const customSections = d.customSections || [];
    const theme = ColorThemes[themeId] || ColorThemes.navy;

    const vars = `
        --modern-sidebar-bg: ${theme.headerBg};
        --modern-accent: ${theme.accent};
        --modern-accent-light: ${theme.accentLight};
        --modern-side-title: ${theme.titleColor};
        --modern-sub-color: ${theme.subColor};
        --modern-title-color: ${theme.titleColor};
        --modern-dot-line: ${theme.accentLight};
        --modern-border-color: ${theme.borderColor};
    `;

    return `
        <style>.modern-resume{${vars}}</style>
        <div class="modern-resume">
            <!-- 侧边栏 + 主内容 -->
            <div class="modern-layout">
                <div class="modern-sidebar">
                    ${personal.avatar ? `<div class="modern-avatar"><img src="${personal.avatar}" alt="头像"></div>` : ''}
                    <h1 class="modern-name">${personal.name || '你的姓名'}</h1>
                    <div class="modern-role">${personal.title || '求职意向'}</div>

                    <div class="modern-side-section">
                        <h3 class="modern-side-title">联系方式</h3>
                        <div class="modern-contact-list">
                            ${personal.phone ? `<div class="modern-contact-item">📞 ${personal.phone}</div>` : ''}
                            ${personal.email ? `<div class="modern-contact-item">✉️ ${personal.email}</div>` : ''}
                            ${personal.location ? `<div class="modern-contact-item">📍 ${personal.location}</div>` : ''}
                        </div>
                    </div>

                    ${skills.length > 0 ? `
                    <div class="modern-side-section">
                        <h3 class="modern-side-title">专业技能</h3>
                        <div class="modern-skills-side">
                            ${skills.map(s => `
                            <span class="modern-skill-text">${s.name || ''}</span>
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>

                <div class="modern-main">
                    ${personal.summary ? `
                    <div class="modern-section">
                        <h2 class="modern-main-title">关于我</h2>
                        <p class="desc-text">${personal.summary}</p>
                    </div>` : ''}

                    ${experience.length > 0 ? `
                    <div class="modern-section">
                        <h2 class="modern-main-title">工作经历</h2>
                        ${experience.map(exp => `
                        <div class="modern-entry">
                            <div class="modern-entry-dot"></div>
                            <div class="modern-entry-body">
                                <div class="modern-entry-header">
                                    <span class="modern-entry-title">${exp.position || ''}</span>
                                    <span class="modern-entry-company">${exp.company || ''}</span>
                                    <span class="date-range">${exp.startDate || ''} — ${exp.endDate || '至今'}</span>
                                </div>
                                ${exp.description ? `<p class="desc-text">${exp.description}</p>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>` : ''}

                    ${education.length > 0 ? `
                    <div class="modern-section">
                        <h2 class="modern-main-title">教育经历</h2>
                        ${education.map(edu => `
                        <div class="modern-entry">
                            <div class="modern-entry-dot"></div>
                            <div class="modern-entry-body">
                                <div class="modern-entry-header">
                                    <span class="modern-entry-title">${edu.school || ''}</span>
                                    <span class="modern-entry-company">${edu.major || ''} · ${edu.degree || ''}</span>
                                    <span class="date-range">${edu.startDate || ''} — ${edu.endDate || '至今'}</span>
                                </div>
                                ${edu.description ? `<p class="desc-text">${edu.description}</p>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>` : ''}

                    ${projects.length > 0 ? `
                    <div class="modern-section">
                        <h2 class="modern-main-title">项目经历</h2>
                        ${projects.map(proj => `
                        <div class="modern-entry">
                            <div class="modern-entry-dot"></div>
                            <div class="modern-entry-body">
                                <div class="modern-entry-header">
                                    <span class="modern-entry-title">${proj.name || ''}</span>
                                    <span class="modern-entry-company">${proj.role ? `(${proj.role})` : ''}</span>
                                    <span class="date-range">${proj.startDate || ''} — ${proj.endDate || '至今'}</span>
                                </div>
                                ${proj.description ? `<p class="desc-text">${proj.description}</p>` : ''}
                                ${proj.link ? `<p class="desc-text" style="margin-top:4px;">🔗 <a href="${proj.link}" target="_blank">${proj.link}</a></p>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>` : ''}
                </div>

                <!-- 自定义模块 -->
                ${Templates.renderCustomSections(customSections, 'modern-', theme)}
            </div>
        </div>
    `;
}, `
    /* 现代清新 专属样式 */
    .modern-resume { padding: 0; }
    .modern-layout { display: flex; min-height: 297mm; }
    .modern-sidebar {
        width: 220px;
        background: var(--modern-sidebar-bg, linear-gradient(180deg, #4f46e5 0%, #7c3aed 100%));
        color: white;
        padding: 32px 20px;
        flex-shrink: 0;
    }
    .modern-avatar { text-align: center; margin-bottom: 16px; }
    .modern-avatar img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.5); }
    .modern-name { font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 4px; }
    .modern-role { font-size: 13px; text-align: center; opacity: 0.85; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); }
    .modern-side-section { margin-bottom: 20px; }
    .modern-side-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; opacity: 0.8; }
    .modern-contact-list { display: flex; flex-direction: column; gap: 6px; }
    .modern-contact-item { font-size: 12px; opacity: 0.9; }
    .modern-skills-side { display: flex; flex-wrap: wrap; gap: 4px 12px; }
    .modern-skill-text { font-size: 13px; color: rgba(255,255,255,0.9); }
    .modern-skill-item { display: flex; justify-content: space-between; align-items: center; }
    .modern-skill-item span { font-size: 13px; }
    .modern-main { flex: 1; padding: 32px 28px; background: white; }
    .modern-main-title { font-size: 17px; font-weight: 700; color: var(--modern-accent, #4f46e5); padding-bottom: 6px; margin-bottom: 12px; border-bottom: 2px solid var(--modern-accent-light, #e0e7ff); }
    .modern-section { margin-bottom: 22px; }
    .modern-entry { display: flex; gap: 12px; margin-bottom: 14px; position: relative; }
    .modern-entry-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--modern-accent, #4f46e5); margin-top: 6px; flex-shrink: 0; position: relative; }
    .modern-entry-dot::after { content: ''; position: absolute; top: 10px; left: 4px; width: 2px; height: calc(100% + 14px); background: var(--modern-accent-light, #e0e7ff); }
    .modern-entry:last-child .modern-entry-dot::after { display: none; }
    .modern-entry-body { flex: 1; }
    .modern-entry-header { margin-bottom: 4px; }
    .modern-entry-title { font-size: 15px; font-weight: 600; color: var(--modern-title-color, #1e293b); }
    .modern-entry-company { font-size: 13px; color: var(--modern-accent, #4f46e5); margin-left: 6px; }
    .modern-entry-header .date-range { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
`);

// ============================================================
// 模板 3: 专业商务 (professional) — 支持色彩主题
// ============================================================
Templates.register('professional', '专业商务', (data, themeId) => {
    const d = data || {};
    const personal = d.personal || {};
    const education = d.education || [];
    const experience = d.experience || [];
    const skills = d.skills || [];
    const projects = d.projects || [];
    const customSections = d.customSections || [];
    const theme = ColorThemes[themeId] || ColorThemes.navy;

    // 将主题色注入为 CSS 变量
    const vars = `
        --pro-header-bg: ${theme.headerBg};
        --pro-header-text: ${theme.headerText};
        --pro-accent: ${theme.accent};
        --pro-accent-light: ${theme.accentLight};
        --pro-section-border: ${theme.sectionBorder};
        --pro-title-color: ${theme.titleColor};
        --pro-sub-color: ${theme.subColor};
        --pro-text-color: ${theme.textColor};
        --pro-light-bg: ${theme.lightBg};
        --pro-border-color: ${theme.borderColor};
        --pro-skill-bg: ${theme.skillBg};
        --pro-skill-border: ${theme.skillBorder};
    `;

    return `
        <style>.pro-resume{${vars}}</style>
        <div class="pro-resume">
            <!-- 头部 — 全宽深色区块，白色文字，无重叠问题 -->
            <div class="pro-header">
                <div class="pro-header-inner">
                    <div class="pro-header-row">
                        ${personal.avatar ? `<div class="pro-avatar"><img src="${personal.avatar}" alt="头像"></div>` : ''}
                        <div class="pro-header-info">
                            <h1 class="pro-name">${personal.name || '你的姓名'}</h1>
                            <div class="pro-role">${personal.title || '求职意向'}</div>
                        </div>
                    </div>
                    <div class="pro-contact-row">
                        ${personal.phone ? `<span>📞 ${personal.phone}</span>` : ''}
                        ${personal.email ? `<span>✉️ ${personal.email}</span>` : ''}
                        ${personal.location ? `<span>📍 ${personal.location}</span>` : ''}
                    </div>
                </div>
            </div>

            <div class="pro-body">
                <!-- 个人简介 -->
                ${personal.summary ? `
                <div class="pro-section">
                    <h2 class="pro-section-title">个人简介</h2>
                    <p class="desc-text">${personal.summary}</p>
                </div>` : ''}

                <div class="pro-two-col">
                    <div class="pro-col-left">
                        <!-- 工作经历 -->
                        ${experience.length > 0 ? `
                        <div class="pro-section">
                            <h2 class="pro-section-title">工作经历</h2>
                            ${experience.map(exp => `
                            <div class="pro-entry">
                                <div class="pro-entry-header">
                                    <div>
                                        <div class="pro-entry-title">${exp.position || ''}</div>
                                        <div class="pro-entry-sub">${exp.company || ''}</div>
                                    </div>
                                    <div class="pro-entry-date">${exp.startDate || ''} - ${exp.endDate || '至今'}</div>
                                </div>
                                ${exp.description ? `<p class="desc-text">${exp.description}</p>` : ''}
                            </div>
                            `).join('')}
                        </div>` : ''}

                        <!-- 项目经历 -->
                        ${projects.length > 0 ? `
                        <div class="pro-section">
                            <h2 class="pro-section-title">项目经历</h2>
                            ${projects.map(proj => `
                            <div class="pro-entry">
                                <div class="pro-entry-header">
                                    <div>
                                        <div class="pro-entry-title">${proj.name || ''}</div>
                                        <div class="pro-entry-sub">${proj.role || ''}</div>
                                    </div>
                                    <div class="pro-entry-date">${proj.startDate || ''} - ${proj.endDate || '至今'}</div>
                                </div>
                                ${proj.description ? `<p class="desc-text">${proj.description}</p>` : ''}
                                ${proj.link ? `<p class="desc-text" style="margin-top:4px;">🔗 ${proj.link}</p>` : ''}
                            </div>
                            `).join('')}
                        </div>` : ''}
                    </div>

                    <div class="pro-col-right">
                        <!-- 教育经历 -->
                        ${education.length > 0 ? `
                        <div class="pro-section">
                            <h2 class="pro-section-title">教育经历</h2>
                            ${education.map(edu => `
                            <div class="pro-entry">
                                <div class="pro-entry-header">
                                    <div>
                                        <div class="pro-entry-title">${edu.school || ''}</div>
                                        <div class="pro-entry-sub">${edu.major || ''} · ${edu.degree || ''}</div>
                                    </div>
                                    <div class="pro-entry-date">${edu.startDate || ''} - ${edu.endDate || '至今'}</div>
                                </div>
                                ${edu.description ? `<p class="desc-text">${edu.description}</p>` : ''}
                            </div>
                            `).join('')}
                        </div>` : ''}

                        <!-- 专业技能 -->
                        ${skills.length > 0 ? `
                        <div class="pro-section">
                            <h2 class="pro-section-title">专业技能</h2>
                            <div class="pro-skills">
                                ${skills.map(s => `
                                <span class="pro-skill-text">${s.name || ''}</span>
                                `).join('')}
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>

            <!-- 自定义模块 -->
            ${Templates.renderCustomSections(customSections, 'pro-', theme)}
        </div>
    `;
}, `
    /* 专业商务 专属样式 — 使用 CSS 变量实现主题化 */
    .pro-resume { padding: 0; }
    .pro-header { background: var(--pro-header-bg); padding: 28px 36px 20px; color: var(--pro-header-text); }
    .pro-header-inner { max-width: 100%; }
    .pro-header-row { display: flex; align-items: center; gap: 20px; }
    .pro-avatar { flex-shrink: 0; }
    .pro-avatar img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.5); }
    .pro-name { font-size: 28px; font-weight: 700; color: var(--pro-header-text); }
    .pro-role { font-size: 15px; color: var(--pro-header-text); opacity: 0.85; font-weight: 400; margin-top: 2px; }
    .pro-contact-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 13px; opacity: 0.85; }
    .pro-contact-row span { display: inline-flex; align-items: center; gap: 4px; }
    .pro-body { padding: 24px 36px 36px; }
    .pro-section { margin-bottom: 22px; }
    .pro-section-title { font-size: 15px; font-weight: 700; color: var(--pro-title-color); padding-bottom: 6px; margin-bottom: 12px; border-bottom: 2px solid var(--pro-section-border); text-transform: uppercase; letter-spacing: 1px; }
    .pro-two-col { display: flex; gap: 32px; }
    .pro-col-left { flex: 1.4; }
    .pro-col-right { flex: 1; }
    .pro-entry { margin-bottom: 14px; }
    .pro-entry-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 12px; }
    .pro-entry-title { font-size: 14px; font-weight: 600; color: var(--pro-title-color); }
    .pro-entry-sub { font-size: 13px; color: var(--pro-sub-color); }
    .pro-entry-date { font-size: 12px; color: #94a3b8; white-space: nowrap; flex-shrink: 0; }
    .pro-skills { display: flex; flex-wrap: wrap; gap: 4px 16px; }
    .pro-skill-text { font-size: 14px; font-weight: 500; color: var(--pro-text-color); }

    @media (max-width: 800px) {
        .pro-two-col { flex-direction: column; gap: 0; }
        .pro-header-row { flex-direction: column; align-items: center; text-align: center; }
        .pro-contact-row { justify-content: center; }
    }
`);
