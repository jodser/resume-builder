/**
 * app.js - 简历工坊主应用逻辑
 * 负责表单绑定、实时预览、模板切换、数据持久化
 */

(function () {
    'use strict';

    // ===== 状态 =====
    let currentData = getDefaultData();
    let currentTemplate = 'classic';
    let saveTimer = null;
    let isSaving = false;

    // ===== DOM 缓存 =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {};

    function cacheDOM() {
        dom.preview = $('#resumePreview');
        dom.templateSelect = $('#templateSelect');
        dom.exportBtn = $('#exportBtn');
        dom.resetBtn = $('#resetBtn');
        dom.saveStatus = $('#saveStatus');
        dom.personal = {
            name: $('#name'),
            title: $('#title'),
            phone: $('#phone'),
            email: $('#email'),
            location: $('#location'),
            summary: $('#summary'),
            avatar: $('#avatar'),
        };
        dom.educationList = $('#educationList');
        dom.experienceList = $('#experienceList');
        dom.skillsList = $('#skillsList');
        dom.projectsList = $('#projectsList');
        dom.addEducation = $('#addEducation');
        dom.addExperience = $('#addExperience');
        dom.addSkill = $('#addSkill');
        dom.addProject = $('#addProject');
    }

    // ===== 默认数据 =====
    function getDefaultData() {
        return {
            personal: {
                name: '',
                title: '',
                phone: '',
                email: '',
                location: '',
                summary: '',
                avatar: '',
            },
            education: [],
            experience: [],
            skills: [],
            projects: [],
        };
    }

    // ===== 数据收集 =====
    function collectFormData() {
        const p = dom.personal;
        const data = {
            personal: {
                name: p.name.value.trim(),
                title: p.title.value.trim(),
                phone: p.phone.value.trim(),
                email: p.email.value.trim(),
                location: p.location.value.trim(),
                summary: p.summary.value.trim(),
                avatar: p.avatar.value.trim(),
            },
            education: collectEntries('education'),
            experience: collectEntries('experience'),
            skills: collectSkills(),
            projects: collectEntries('projects'),
        };
        return data;
    }

    function collectEntries(type) {
        const container = dom[`${type}List`];
        if (!container) return [];
        const cards = container.querySelectorAll('.entry-card');
        const result = [];
        cards.forEach(card => {
            const inputs = card.querySelectorAll('input, textarea');
            const entry = {};
            inputs.forEach(input => {
                if (input.name) {
                    entry[input.name] = input.value.trim();
                }
            });
            // Only include if at least one field has content
            if (Object.values(entry).some(v => v)) {
                result.push(entry);
            }
        });
        return result;
    }

    function collectSkills() {
        const container = dom.skillsList;
        if (!container) return [];
        const entries = container.querySelectorAll('.skill-entry');
        const result = [];
        entries.forEach(entry => {
            const input = entry.querySelector('.skill-name-input');
            const name = input?.value?.trim() || '';
            if (name) {
                result.push({ name });
            }
        });
        return result;
    }

    // ===== 数据填充到表单 =====
    function populateForm(data) {
        if (!data) return;
        const p = dom.personal;
        const pd = data.personal || {};
        p.name.value = pd.name || '';
        p.title.value = pd.title || '';
        p.phone.value = pd.phone || '';
        p.email.value = pd.email || '';
        p.location.value = pd.location || '';
        p.summary.value = pd.summary || '';
        p.avatar.value = pd.avatar || '';

        renderEducationList(data.education || []);
        renderExperienceList(data.experience || []);
        renderSkillsList(data.skills || []);
        renderProjectsList(data.projects || []);
    }

    // ===== 渲染条目列表 =====
    function renderEducationList(items) {
        renderEntryCards('education', items, [
            { name: 'school', label: '学校', type: 'text', placeholder: '学校名称' },
            { name: 'degree', label: '学历', type: 'text', placeholder: '本科/硕士/博士' },
            { name: 'major', label: '专业', type: 'text', placeholder: '专业名称' },
            { name: 'startDate', label: '开始时间', type: 'text', placeholder: '2018-09' },
            { name: 'endDate', label: '结束时间', type: 'text', placeholder: '2022-06 或 至今' },
            { name: 'description', label: '描述（可选）', type: 'textarea', placeholder: 'GPA、荣誉、相关课程等' },
        ]);
    }

    function renderExperienceList(items) {
        renderEntryCards('experience', items, [
            { name: 'company', label: '公司', type: 'text', placeholder: '公司名称' },
            { name: 'position', label: '职位', type: 'text', placeholder: '职位名称' },
            { name: 'startDate', label: '开始时间', type: 'text', placeholder: '2020-03' },
            { name: 'endDate', label: '结束时间', type: 'text', placeholder: '2023-01 或 至今' },
            { name: 'description', label: '工作描述', type: 'textarea', placeholder: '描述工作职责和成就' },
        ]);
    }

    function renderProjectsList(items) {
        renderEntryCards('projects', items, [
            { name: 'name', label: '项目名称', type: 'text', placeholder: '项目名称' },
            { name: 'role', label: '角色', type: 'text', placeholder: '负责人/开发者' },
            { name: 'startDate', label: '开始时间', type: 'text', placeholder: '2022-01' },
            { name: 'endDate', label: '结束时间', type: 'text', placeholder: '2022-06 或 至今' },
            { name: 'description', label: '项目描述', type: 'textarea', placeholder: '项目简介、技术栈、你的贡献' },
            { name: 'link', label: '链接（可选）', type: 'text', placeholder: 'https://github.com/...' },
        ]);
    }

    function renderSkillsList(items) {
        const container = dom.skillsList;
        if (!container) return;
        container.innerHTML = '';
        if (!items || items.length === 0) {
            items = [{ name: '' }];
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'skill-entry';
            div.innerHTML = `
                <input type="text" class="skill-name-input" placeholder="技能名称" value="${escapeHtml(item.name || '')}">
                <button class="btn-remove" title="删除">✕</button>
            `;
            container.appendChild(div);

            // 删除按钮
            div.querySelector('.btn-remove').addEventListener('click', () => {
                div.remove();
                onFormChange();
            });

            // 输入事件
            div.querySelector('input').addEventListener('input', onFormChange);
        });
    }

    function renderEntryCards(type, items, fields) {
        const container = dom[`${type}List`];
        if (!container) return;
        container.innerHTML = '';
        if (!items || items.length === 0) return;

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'entry-card';
            const titleField = fields.find(f => f.name === 'name' || f.name === 'school' || f.name === 'company');
            const titleText = item[titleField?.name] || `${type}-${index + 1}`;

            let fieldsHTML = fields.map(f => {
                const val = escapeHtml(item[f.name] || '');
                if (f.type === 'textarea') {
                    return `<div class="form-group"><label>${f.label}</label><textarea name="${f.name}" rows="2" placeholder="${f.placeholder}">${val}</textarea></div>`;
                }
                return `<div class="form-group"><label>${f.label}</label><input type="text" name="${f.name}" placeholder="${f.placeholder}" value="${val}"></div>`;
            }).join('');

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${escapeHtml(titleText)}</span>
                    <button class="btn-remove" title="删除">✕ 删除</button>
                </div>
                ${fieldsHTML}
            `;
            container.appendChild(card);

            // 删除
            card.querySelector('.btn-remove').addEventListener('click', () => {
                card.remove();
                updateEntryTitles(type);
                onFormChange();
            });

            // 输入事件
            card.querySelectorAll('input, textarea').forEach(el => {
                el.addEventListener('input', () => {
                    updateEntryTitles(type);
                    onFormChange();
                });
            });
        });
    }

    function updateEntryTitles(type) {
        const container = dom[`${type}List`];
        if (!container) return;
        const cards = container.querySelectorAll('.entry-card');
        cards.forEach((card, index) => {
            const titleEl = card.querySelector('.card-title');
            if (!titleEl) return;
            // Use first input's value as title
            const firstInput = card.querySelector('input');
            const val = firstInput ? firstInput.value.trim() : '';
            titleEl.textContent = val || `${getTypeLabel(type)} ${index + 1}`;
        });
    }

    function getTypeLabel(type) {
        const map = { education: '教育经历', experience: '工作经历', projects: '项目' };
        return map[type] || type;
    }

    // ===== 添加条目 =====
    function addEntry(type) {
        const container = dom[`${type}List`];
        if (!container) return;
        const emptyObj = {};
        if (type === 'skills') {
            renderSkillsList([...collectSkills(), { name: '' }]);
        } else {
            const existing = collectEntries(type);
            existing.push(emptyObj);
            // Re-render with the correct render function
            switch (type) {
                case 'education': renderEducationList(existing); break;
                case 'experience': renderExperienceList(existing); break;
                case 'projects': renderProjectsList(existing); break;
            }
        }
        onFormChange();
        // Scroll to the new entry
        container.scrollTop = container.scrollHeight;
    }

    // ===== 表单变化处理 =====
    function onFormChange() {
        const data = collectFormData();
        currentData = data;
        renderPreview();
        scheduleSave(data);
    }

    let previewRenderTimer = null;

    function renderPreview() {
        if (previewRenderTimer) {
            cancelAnimationFrame(previewRenderTimer);
        }
        previewRenderTimer = requestAnimationFrame(() => {
            const html = Templates.render(currentTemplate, currentData);
            dom.preview.innerHTML = html;
            previewRenderTimer = null;
        });
    }

    // ===== 本地存储 =====
    function scheduleSave(data) {
        if (saveTimer) clearTimeout(saveTimer);
        dom.saveStatus.textContent = '保存中...';
        dom.saveStatus.className = 'save-status saving';
        saveTimer = setTimeout(() => {
            const success = Storage.save(data);
            dom.saveStatus.textContent = success ? '已保存' : '保存失败';
            dom.saveStatus.className = `save-status ${success ? '' : 'error'}`;
            saveTimer = null;
        }, Storage.SAVE_DEBOUNCE);
    }

    function loadSavedData() {
        const saved = Storage.load();
        if (saved) {
            currentData = saved;
            populateForm(saved);
            return true;
        }
        return false;
    }

    // ===== 模板切换 =====
    function switchTemplate(templateId) {
        currentTemplate = templateId;
        renderPreview();
        // 保存模板偏好
        try {
            localStorage.setItem('resume-builder-template', templateId);
        } catch (e) { /* ignore */ }
    }

    // ===== 导出 PDF =====
    function exportPDF() {
        window.print();
    }

    // ===== 重置 =====
    function resetAll() {
        if (!confirm('确定要重置所有数据吗？此操作不可恢复！')) return;
        Storage.clear();
        try {
            localStorage.removeItem('resume-builder-template');
        } catch (e) { /* ignore */ }
        currentData = getDefaultData();
        populateForm(currentData);
        renderPreview();
        dom.saveStatus.textContent = '已重置';
        dom.saveStatus.className = 'save-status';
    }

    // ===== 工具函数 =====
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===== 事件绑定 =====
    function bindEvents() {
        // 个人信息输入
        Object.values(dom.personal).forEach(el => {
            if (el) {
                el.addEventListener('input', onFormChange);
            }
        });

        // 添加按钮
        dom.addEducation?.addEventListener('click', () => addEntry('education'));
        dom.addExperience?.addEventListener('click', () => addEntry('experience'));
        dom.addSkill?.addEventListener('click', () => addEntry('skills'));
        dom.addProject?.addEventListener('click', () => addEntry('projects'));

        // 模板切换
        dom.templateSelect?.addEventListener('change', (e) => {
            switchTemplate(e.target.value);
        });

        // 导出
        dom.exportBtn?.addEventListener('click', exportPDF);

        // 重置
        dom.resetBtn?.addEventListener('click', resetAll);

        // 折叠/展开
        $$('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                if (section) {
                    section.classList.toggle('collapsed');
                }
            });
        });
    }

    // ===== 初始化 =====
    function init() {
        cacheDOM();
        bindEvents();

        // 加载保存的模板偏好
        try {
            const savedTmpl = localStorage.getItem('resume-builder-template');
            if (savedTmpl && Templates.registry[savedTmpl]) {
                dom.templateSelect.value = savedTmpl;
                currentTemplate = savedTmpl;
            }
        } catch (e) { /* ignore */ }

        // 加载保存的数据
        const hasSaved = loadSavedData();
        if (!hasSaved) {
            // 第一次使用，填充示例数据
            currentData = getSampleData();
            populateForm(currentData);
        }

        // 初始渲染
        renderPreview();
        dom.saveStatus.textContent = '已就绪';
        dom.saveStatus.className = 'save-status';
    }

    // ===== 示例数据 =====
    function getSampleData() {
        return {
            personal: {
                name: '张三',
                title: '高级前端工程师',
                phone: '138-0000-0000',
                email: 'zhangsan@example.com',
                location: '北京市朝阳区',
                summary: '拥有 5 年前端开发经验，精通 React、Vue 等主流框架，对性能优化和工程化有深入理解。热爱开源，善于团队协作，具备良好的技术沟通能力。',
                avatar: '',
            },
            education: [
                { school: '北京大学', degree: '本科', major: '计算机科学与技术', startDate: '2015-09', endDate: '2019-06', description: 'GPA 3.8/4.0，获优秀毕业生称号' },
            ],
            experience: [
                { company: '字节跳动', position: '前端工程师', startDate: '2021-03', endDate: '至今', description: '负责抖音电商 H5 活动页开发，日活超千万；推动组件库建设，提升团队开发效率 30%。' },
                { company: '美团', position: '前端开发实习生', startDate: '2019-07', endDate: '2021-02', description: '参与美团外卖商家端后台管理系统的前端开发，使用 React + TypeScript 技术栈。' },
            ],
            skills: [
                { name: 'JavaScript/TypeScript' },
                { name: 'React' },
                { name: 'Vue.js' },
                { name: 'Node.js' },
                { name: 'CSS/Tailwind' },
                { name: 'Webpack/Vite' },
            ],
            projects: [
                { name: '在线简历工坊', role: '独立开发者', startDate: '2024-01', endDate: '2024-02', description: '一个支持多模板切换、实时预览的在线简历制作工具。使用原生 JavaScript + CSS 开发，支持导出 PDF。', link: '' },
            ],
        };
    }

    // ===== 启动 =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
