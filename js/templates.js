/**
 * templates.js - 简历模板系统
 * 定义多套简历模板的渲染函数和样式
 */

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
    render(templateId, data) {
        const tmpl = this.get(templateId);
        const mainHTML = tmpl.renderer(data);
        const extraCSS = tmpl.extraCSS || '';
        const baseCSS = this.getBaseCSS();
        return `<style>${baseCSS}\n${extraCSS}</style><div class="resume-template tmpl-${templateId}">${mainHTML}</div>`;
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
                font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
                color: #333;
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
        `;
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
// 模板 2: 现代清新 (modern)
// ============================================================
Templates.register('modern', '现代清新', (data) => {
    const d = data || {};
    const personal = d.personal || {};
    const education = d.education || [];
    const experience = d.experience || [];
    const skills = d.skills || [];
    const projects = d.projects || [];

    return `
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
            </div>
        </div>
    `;
}, `
    /* 现代清新 专属样式 */
    .modern-resume { padding: 0; }
    .modern-layout { display: flex; min-height: 297mm; }
    .modern-sidebar {
        width: 220px;
        background: linear-gradient(180deg, #4f46e5 0%, #7c3aed 100%);
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
    .modern-main-title { font-size: 17px; font-weight: 700; color: #4f46e5; padding-bottom: 6px; margin-bottom: 12px; border-bottom: 2px solid #e0e7ff; }
    .modern-section { margin-bottom: 22px; }
    .modern-entry { display: flex; gap: 12px; margin-bottom: 14px; position: relative; }
    .modern-entry-dot { width: 10px; height: 10px; border-radius: 50%; background: #4f46e5; margin-top: 6px; flex-shrink: 0; position: relative; }
    .modern-entry-dot::after { content: ''; position: absolute; top: 10px; left: 4px; width: 2px; height: calc(100% + 14px); background: #e0e7ff; }
    .modern-entry:last-child .modern-entry-dot::after { display: none; }
    .modern-entry-body { flex: 1; }
    .modern-entry-header { margin-bottom: 4px; }
    .modern-entry-title { font-size: 15px; font-weight: 600; color: #1e293b; }
    .modern-entry-company { font-size: 13px; color: #4f46e5; margin-left: 6px; }
    .modern-entry-header .date-range { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
`);

// ============================================================
// 模板 3: 专业商务 (professional)
// ============================================================
Templates.register('professional', '专业商务', (data) => {
    const d = data || {};
    const personal = d.personal || {};
    const education = d.education || [];
    const experience = d.experience || [];
    const skills = d.skills || [];
    const projects = d.projects || [];

    return `
        <div class="pro-resume">
            <!-- 头部 -->
            <div class="pro-header">
                <div class="pro-header-bg"></div>
                <div class="pro-header-content">
                    ${personal.avatar ? `<div class="pro-avatar"><img src="${personal.avatar}" alt="头像"></div>` : ''}
                    <div class="pro-header-text">
                        <h1 class="pro-name">${personal.name || '你的姓名'}</h1>
                        <div class="pro-title">${personal.title || '求职意向'}</div>
                        <div class="pro-contact-bar">
                            ${personal.phone ? `<span>${personal.phone}</span>` : ''}
                            ${personal.email ? `<span>${personal.email}</span>` : ''}
                            ${personal.location ? `<span>${personal.location}</span>` : ''}
                        </div>
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
        </div>
    `;
}, `
    /* 专业商务 专属样式 */
    .pro-resume { padding: 0; }
    .pro-header { position: relative; margin-bottom: 0; }
    .pro-header-bg { height: 80px; background: linear-gradient(135deg, #1e293b, #334155); }
    .pro-header-content { display: flex; align-items: flex-end; gap: 20px; padding: 0 36px; margin-top: -40px; }
    .pro-avatar { flex-shrink: 0; }
    .pro-avatar img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .pro-header-text { padding-bottom: 16px; flex: 1; }
    .pro-name { font-size: 28px; font-weight: 700; color: #1e293b; }
    .pro-title { font-size: 15px; color: #4f46e5; font-weight: 500; margin-top: 2px; }
    .pro-contact-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 12px; color: #64748b; }
    .pro-contact-bar span { padding-right: 12px; border-right: 1px solid #e2e8f0; }
    .pro-contact-bar span:last-child { border-right: none; }
    .pro-body { padding: 24px 36px 36px; }
    .pro-section { margin-bottom: 22px; }
    .pro-section-title { font-size: 15px; font-weight: 700; color: #1e293b; padding-bottom: 6px; margin-bottom: 12px; border-bottom: 2px solid #334155; text-transform: uppercase; letter-spacing: 1px; }
    .pro-two-col { display: flex; gap: 32px; }
    .pro-col-left { flex: 1.4; }
    .pro-col-right { flex: 1; }
    .pro-entry { margin-bottom: 14px; }
    .pro-entry-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 12px; }
    .pro-entry-title { font-size: 14px; font-weight: 600; color: #1e293b; }
    .pro-entry-sub { font-size: 13px; color: #4f46e5; }
    .pro-entry-date { font-size: 12px; color: #94a3b8; white-space: nowrap; flex-shrink: 0; }
    .pro-skills { display: flex; flex-wrap: wrap; gap: 4px 16px; }
    .pro-skill-text { font-size: 14px; font-weight: 500; color: #334155; }
    .pro-skill { }
    .pro-skill-name { font-size: 13px; font-weight: 500; color: #334155; margin-bottom: 3px; }
    .pro-skill-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .pro-skill-fill { height: 100%; background: linear-gradient(90deg, #334155, #64748b); border-radius: 3px; }

    @media (max-width: 800px) {
        .pro-two-col { flex-direction: column; gap: 0; }
        .pro-header-content { flex-direction: column; align-items: center; text-align: center; margin-top: -50px; }
        .pro-contact-bar { justify-content: center; }
    }
`);
