/**
 * app.js - 简历工坊主应用逻辑
 * 负责表单绑定、实时预览、模板切换、数据持久化
 */

(function () {
    'use strict';

    // ===== 状态 =====
    let currentData = getDefaultData();
    let currentTemplate = 'classic';
    let currentColorTheme = 'navy';
    let currentFontFamily = '';
    let currentTextColor = '';
    let saveTimer = null;
    let isSaving = false;

    // 文字颜色预设
    const TEXT_COLORS = [
        { value: '#333333', label: '深灰（默认）' },
        { value: '#1a1a1a', label: '纯黑' },
        { value: '#555555', label: '柔和灰' },
        { value: '#2c3e50', label: '深蓝灰' },
        { value: '#5d4037', label: '暖棕' },
        { value: '#1e3a5f', label: '藏蓝' },
    ];

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
        dom.importPdfBtn = $('#importPdfBtn');
        dom.pdfFileInput = $('#pdfFileInput');
        dom.loadingOverlay = $('#loadingOverlay');
        dom.loadingText = $('#loadingText');
        dom.loadingProgress = $('#loadingProgress');
        dom.importChoiceOverlay = $('#importChoiceOverlay');
        dom.choiceImported = $('#choiceImported');
        dom.choiceBuiltin = $('#choiceBuiltin');
        dom.choiceBuiltinPicker = $('#choiceBuiltinPicker');
        dom.choiceTemplateSelect = $('#choiceTemplateSelect');
        dom.choiceConfirmBtn = $('#choiceConfirmBtn');
        dom.choiceCancelBtn = $('#choiceCancelBtn');
        dom.customModuleOverlay = $('#customModuleOverlay');
        dom.cmName = $('#cmName');
        dom.cmFields = $('#cmFields');
        dom.cmConfirmBtn = $('#cmConfirmBtn');
        dom.cmCancelBtn = $('#cmCancelBtn');
        dom.customSectionsContainer = $('#customSectionsContainer');
        dom.addCustomModuleBtn = $('#addCustomModuleBtn');
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
        dom.themePicker = $('#themePicker');
        dom.themeSwatches = $('#themeSwatches');
        dom.fontSelect = $('#fontSelect');
        dom.textColorSwatches = $('#textColorSwatches');
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
            customSections: [],
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
            customSections: collectCustomSections(),
        };
        return data;
    }

    function collectCustomSections() {
        const result = [];
        const modules = dom.customSectionsContainer?.querySelectorAll('.custom-section');
        if (!modules) return result;
        modules.forEach(mod => {
            const id = mod.dataset.moduleId;
            const title = mod.querySelector('.cs-title-input')?.value.trim() || '自定义模块';
            const entries = [];
            const entryCards = mod.querySelectorAll('.cs-entry');
            entryCards.forEach(card => {
                const entry = {};
                card.querySelectorAll('input, textarea').forEach(el => {
                    if (el.name) entry[el.name] = el.value.trim();
                });
                if (Object.values(entry).some(v => v)) entries.push(entry);
            });
            // 提取 fields 定义
            const fields = [];
            const fieldDefs = mod.dataset.fieldsDef;
            if (fieldDefs) {
                try { 
                    const parsed = JSON.parse(fieldDefs);
                    if (Array.isArray(parsed)) fields.push(...parsed);
                } catch(e) {}
            }
            result.push({ id, title, fields, entries });
        });
        return result;
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
        renderCustomSections(data.customSections || []);
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
        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'skill-entry';
            const isLong = (item.name || '').length > 20;
            div.innerHTML = `
                <div class="skill-reorder">
                    <button class="btn-move-up" title="上移" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="btn-move-down" title="下移" ${index === items.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                ${isLong
                    ? `<textarea class="skill-name-input skill-textarea" rows="2" placeholder="技能或描述">${escapeHtml(item.name || '')}</textarea>`
                    : `<input type="text" class="skill-name-input" placeholder="技能名称" value="${escapeHtml(item.name || '')}">`
                }
                <button class="btn-remove" title="删除">✕</button>
            `;
            container.appendChild(div);

            // 自动切换 input/textarea 当内容变长时
            const inputEl = div.querySelector('.skill-name-input');
            if (inputEl) {
                inputEl.addEventListener('input', function() {
                    // 如果内容超过20字符且是input，换成textarea
                    if (this.value.length > 20 && this.tagName === 'INPUT') {
                        const val = this.value;
                        const ta = document.createElement('textarea');
                        ta.className = 'skill-name-input skill-textarea';
                        ta.rows = 2;
                        ta.placeholder = '技能或描述';
                        ta.value = val;
                        this.parentNode.replaceChild(ta, this);
                        ta.addEventListener('input', onFormChange);
                        ta.addEventListener('input', autoResizeTextarea);
                        // 立即自动调整高度
                        autoResizeTextarea.call(ta);
                    } else if (this.value.length <= 20 && this.tagName === 'TEXTAREA' && this.value.indexOf('\n') === -1) {
                        // 内容变短且无换行，换回input
                        const val = this.value;
                        const inp = document.createElement('input');
                        inp.type = 'text';
                        inp.className = 'skill-name-input';
                        inp.placeholder = '技能名称';
                        inp.value = val;
                        this.parentNode.replaceChild(inp, this);
                        inp.addEventListener('input', onFormChange);
                    }
                    onFormChange();
                    setTimeout(() => autoResizeTextarea.call(this), 0);
                });
                if (inputEl.tagName === 'TEXTAREA') {
                    inputEl.addEventListener('input', autoResizeTextarea);
                    setTimeout(() => autoResizeTextarea.call(inputEl), 0);
                }
            }

            // 上移
            div.querySelector('.btn-move-up')?.addEventListener('click', () => {
                const skills = collectSkills();
                if (index > 0) {
                    [skills[index - 1], skills[index]] = [skills[index], skills[index - 1]];
                    renderSkillsList(skills);
                    onFormChange();
                }
            });

            // 下移
            div.querySelector('.btn-move-down')?.addEventListener('click', () => {
                const skills = collectSkills();
                if (index < skills.length - 1) {
                    [skills[index], skills[index + 1]] = [skills[index + 1], skills[index]];
                    renderSkillsList(skills);
                    onFormChange();
                }
            });

            // 删除按钮
            div.querySelector('.btn-remove').addEventListener('click', () => {
                div.remove();
                onFormChange();
            });
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
                const isLong = val.length > 20;
                if (f.type === 'textarea' || isLong) {
                    return `<div class="form-group"><label>${f.label}</label><textarea name="${f.name}" rows="${isLong ? 3 : 2}" placeholder="${f.placeholder}" class="auto-resize-ta">${val}</textarea></div>`;
                }
                return `<div class="form-group"><label>${f.label}</label><input type="text" name="${f.name}" placeholder="${f.placeholder}" value="${val}"></div>`;
            }).join('');

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-reorder">
                        <button class="btn-move-up" title="上移" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="btn-move-down" title="下移" ${index === items.length - 1 ? 'disabled' : ''}>▼</button>
                    </div>
                    <span class="card-title">${escapeHtml(titleText)}</span>
                    <button class="btn-remove" title="删除">✕ 删除</button>
                </div>
                ${fieldsHTML}
            `;
            container.appendChild(card);

            // 上移
            card.querySelector('.btn-move-up')?.addEventListener('click', () => {
                const entries = collectEntries(type);
                if (index > 0) {
                    [entries[index - 1], entries[index]] = [entries[index], entries[index - 1]];
                    switch (type) {
                        case 'education': renderEducationList(entries); break;
                        case 'experience': renderExperienceList(entries); break;
                        case 'projects': renderProjectsList(entries); break;
                    }
                    onFormChange();
                }
            });

            // 下移
            card.querySelector('.btn-move-down')?.addEventListener('click', () => {
                const entries = collectEntries(type);
                if (index < entries.length - 1) {
                    [entries[index], entries[index + 1]] = [entries[index + 1], entries[index]];
                    switch (type) {
                        case 'education': renderEducationList(entries); break;
                        case 'experience': renderExperienceList(entries); break;
                        case 'projects': renderProjectsList(entries); break;
                    }
                    onFormChange();
                }
            });

            // 删除
            card.querySelector('.btn-remove').addEventListener('click', () => {
                card.remove();
                updateEntryTitles(type);
                onFormChange();
            });

            // 输入事件 + 自动 resize textarea
            card.querySelectorAll('input, textarea').forEach(el => {
                if (el.tagName === 'TEXTAREA') {
                    el.classList.add('auto-resize-ta');
                    setTimeout(() => autoResizeTextarea.call(el), 0);
                    el.addEventListener('input', function() {
                        autoResizeTextarea.call(this);
                        updateEntryTitles(type);
                        onFormChange();
                    });
                } else {
                    el.addEventListener('input', function() {
                        // 如果输入变长，自动转 textarea
                        if (this.value.length > 25) {
                            const ta = document.createElement('textarea');
                            ta.name = this.name;
                            ta.placeholder = this.placeholder;
                            ta.className = 'auto-resize-ta';
                            ta.rows = 2;
                            ta.value = this.value;
                            const parent = this.parentNode;
                            const label = parent.querySelector('label');
                            parent.insertBefore(ta, this);
                            parent.removeChild(this);
                            setTimeout(() => autoResizeTextarea.call(ta), 0);
                            ta.addEventListener('input', function() {
                                autoResizeTextarea.call(this);
                                updateEntryTitles(type);
                                onFormChange();
                            });
                        }
                        updateEntryTitles(type);
                        onFormChange();
                    });
                }
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

    // ===== 搜索过滤 =====
    function filterSection(type, query) {
        const container = dom[`${type}List`];
        if (!container) return;
        const q = query.toLowerCase().trim();
        const cards = container.querySelectorAll(':scope > .entry-card, :scope > .skill-entry');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
    }

    // ===== 构建搜索框 =====
    function buildFilterInput(type, placeholder) {
        const existing = document.querySelector(`.section-filter[data-section="${type}"]`);
        if (existing) return existing;

        const container = dom[`${type}List`];
        if (!container) return null;

        const filterDiv = document.createElement('div');
        filterDiv.className = 'section-filter';
        filterDiv.dataset.section = type;
        filterDiv.innerHTML = `
            <input type="text" class="filter-input" placeholder="${placeholder}" spellcheck="false">
        `;
        container.parentNode.insertBefore(filterDiv, container);

        const input = filterDiv.querySelector('.filter-input');
        input.addEventListener('input', () => filterSection(type, input.value));
        // 清除按钮
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.value = '';
                filterSection(type, '');
                input.blur();
            }
        });

        return filterDiv;
    }

    // ===== 初始化所有搜索框 =====
    function initFilters() {
        buildFilterInput('education', '🔍 搜索教育经历...');
        buildFilterInput('experience', '🔍 搜索工作经历...');
        buildFilterInput('skills', '🔍 搜索技能...');
        buildFilterInput('projects', '🔍 搜索项目...');
    }

    // ===== 自定义模块 =====
    let _cmIdCounter = 0;

    function showCreateModuleModal() {
        if (!dom.customModuleOverlay) return;
        dom.cmName.value = '';
        dom.cmFields.value = '名称\n描述:textarea';
        dom.customModuleOverlay.style.display = 'flex';
        setTimeout(() => dom.cmName?.focus(), 100);
    }

    function hideCreateModuleModal() {
        if (!dom.customModuleOverlay) return;
        dom.customModuleOverlay.style.display = 'none';
    }

    function confirmCreateModule() {
        const name = dom.cmName.value.trim();
        if (!name) { alert('请输入模块名称'); dom.cmName.focus(); return; }

        const rawFields = dom.cmFields.value.trim();
        if (!rawFields) { alert('请至少定义一个字段'); dom.cmFields.focus(); return; }

        const fields = [];
        rawFields.split('\n').forEach(line => {
            const f = line.trim();
            if (!f) return;
            if (f.includes(':')) {
                const [fn, ft] = f.split(':');
                fields.push({ name: fn.trim(), label: fn.trim(), type: ft.trim() === 'textarea' ? 'textarea' : 'text' });
            } else {
                fields.push({ name: f, label: f, type: 'text' });
            }
        });
        if (fields.length === 0) { alert('请至少定义一个有效字段'); return; }

        // 生成唯一 id
        _cmIdCounter++;
        const id = 'cm-' + Date.now() + '-' + _cmIdCounter;

        // 添加到当前数据
        const newSection = { id, title: name, fields, entries: [] };
        const current = collectCustomSections();
        current.push(newSection);
        renderCustomSections(current);
        onFormChange();

        hideCreateModuleModal();
        dom.saveStatus.textContent = `✅ 已添加模块: ${name}`;
        dom.saveStatus.className = 'save-status';
        setTimeout(() => { dom.saveStatus.textContent = '已保存'; }, 2000);
    }

    function renderCustomSections(sections) {
        const container = dom.customSectionsContainer;
        if (!container) return;
        container.innerHTML = '';

        (sections || []).forEach((section, secIdx) => {
            const modId = section.id || 'cm-' + Date.now() + '-' + secIdx;

            const secDiv = document.createElement('div');
            secDiv.className = 'form-section custom-section';
            secDiv.dataset.moduleId = modId;
            secDiv.dataset.fieldsDef = JSON.stringify(section.fields || []);

            const fieldNames = (section.fields || []).map(f => f.name);

            secDiv.innerHTML = `
                <div class="section-header cs-header" data-toggle="${modId}">
                    <div class="cs-header-left">
                        <span class="cs-icon">🧩</span>
                        <input type="text" class="cs-title-input" value="${escapeHtml(section.title || '自定义模块')}" placeholder="模块名称">
                    </div>
                    <div class="cs-header-right">
                        <button class="btn-cs-delete" title="删除此模块">✕</button>
                        <span class="toggle-icon">▼</span>
                    </div>
                </div>
                <div class="section-body cs-body" id="csBody-${modId}">
                    <div class="cs-entries" id="csEntries-${modId}">
                        ${renderCustomSectionEntriesHTML(section.entries || [], fieldNames, section.fields)}
                    </div>
                    <button class="btn btn-add cs-add-entry" data-module="${modId}">+ 添加条目</button>
                </div>
            `;
            container.appendChild(secDiv);

            // 标题编辑
            secDiv.querySelector('.cs-title-input').addEventListener('input', onFormChange);

            // 折叠
            secDiv.querySelector('.cs-header').addEventListener('click', (e) => {
                if (e.target.closest('input') || e.target.closest('button')) return;
                secDiv.classList.toggle('collapsed');
            });

            // 删除模块
            secDiv.querySelector('.btn-cs-delete').addEventListener('click', () => {
                if (!confirm(`确定要删除模块「${section.title}」吗？`)) return;
                const all = collectCustomSections();
                const filtered = all.filter(s => s.id !== modId);
                renderCustomSections(filtered);
                onFormChange();
            });

            // 添加条目
            secDiv.querySelector('.cs-add-entry').addEventListener('click', () => {
                const all = collectCustomSections();
                const target = all.find(s => s.id === modId);
                if (target) {
                    const empty = {};
                    fieldNames.forEach(fn => { empty[fn] = ''; });
                    target.entries.push(empty);
                    renderCustomSections(all);
                    onFormChange();
                    // 滚动到底部
                    const body = secDiv.querySelector('.cs-body');
                    if (body) body.scrollTop = body.scrollHeight;
                }
            });

            // 条目内的 input/textarea 事件
            secDiv.querySelectorAll('.cs-entry input, .cs-entry textarea').forEach(el => {
                el.addEventListener('input', onFormChange);
                if (el.tagName === 'TEXTAREA') {
                    el.classList.add('auto-resize-ta');
                    setTimeout(() => autoResizeTextarea.call(el), 0);
                    el.addEventListener('input', function() { autoResizeTextarea.call(this); });
                }
            });

            // 条目删除
            secDiv.querySelectorAll('.cs-entry-remove').forEach(btn => {
                btn.addEventListener('click', function() {
                    const card = this.closest('.cs-entry');
                    if (card) {
                        card.remove();
                        onFormChange();
                    }
                });
            });

            // 条目上下移动
            secDiv.querySelectorAll('.cs-move-up').forEach(btn => {
                btn.addEventListener('click', function() {
                    const card = this.closest('.cs-entry');
                    const parent = card?.parentNode;
                    if (card && parent && card.previousElementSibling) {
                        parent.insertBefore(card, card.previousElementSibling);
                        onFormChange();
                    }
                });
            });
            secDiv.querySelectorAll('.cs-move-down').forEach(btn => {
                btn.addEventListener('click', function() {
                    const card = this.closest('.cs-entry');
                    const parent = card?.parentNode;
                    if (card && parent && card.nextElementSibling) {
                        parent.insertBefore(card.nextElementSibling, card);
                        onFormChange();
                    }
                });
            });
        });
    }

    function renderCustomSectionEntriesHTML(entries, fieldNames, fields) {
        if (!entries || entries.length === 0) return '';
        return entries.map((entry, ei) => {
            const fieldsHTML = fields.map((f, fi) => {
                const val = escapeHtml(entry[f.name] || '');
                if (f.type === 'textarea') {
                    return `<div class="form-group"><label>${escapeHtml(f.label)}</label><textarea name="${escapeHtml(f.name)}" rows="2" placeholder="${escapeHtml(f.label)}" class="cs-field-ta">${val}</textarea></div>`;
                }
                return `<div class="form-group"><label>${escapeHtml(f.label)}</label><input type="text" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.label)}" value="${val}">`;
            }).join('');
            return `
                <div class="entry-card cs-entry" data-index="${ei}">
                    <div class="card-header">
                        <div class="card-reorder">
                            <button class="btn-move-up cs-move-up" title="上移" ${ei === 0 ? 'disabled' : ''}>▲</button>
                            <button class="btn-move-down cs-move-down" title="下移">▼</button>
                        </div>
                        <span class="card-title">${escapeHtml(entry[fieldNames[0]] || '') || `条目 ${ei + 1}`}</span>
                        <button class="btn-remove cs-entry-remove" title="删除">✕ 删除</button>
                    </div>
                    ${fieldsHTML}
                </div>
            `;
        }).join('');
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
            const html = Templates.render(currentTemplate, currentData, currentColorTheme, currentFontFamily, currentTextColor);
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
        // 专业商务和现代清新模板显示配色选择器
        if (dom.themePicker) {
            dom.themePicker.style.display = (templateId === 'professional' || templateId === 'modern') ? 'flex' : 'none';
        }
        renderPreview();
        try {
            localStorage.setItem('resume-builder-template', templateId);
        } catch (e) { /* ignore */ }
    }

    // ===== 色彩主题 =====
    function buildThemeSwatches() {
        const container = dom.themeSwatches;
        if (!container) return;
        container.innerHTML = '';
        Object.entries(ColorThemes).forEach(([id, theme]) => {
            const swatch = document.createElement('button');
            swatch.className = 'theme-swatch' + (id === currentColorTheme ? ' active' : '');
            swatch.dataset.theme = id;
            swatch.title = theme.name;
            // 提取渐变的第一个颜色作为色块展示
            const firstColor = theme.headerBg.match(/#[a-f0-9]{6}/)?.[0] || '#1e293b';
            swatch.style.background = firstColor;
            swatch.addEventListener('click', () => switchColorTheme(id));
            container.appendChild(swatch);
        });
    }

    function switchColorTheme(themeId) {
        currentColorTheme = themeId;
        dom.themeSwatches?.querySelectorAll('.theme-swatch').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === themeId);
        });
        renderPreview();
        try {
            localStorage.setItem('resume-builder-color-theme', themeId);
        } catch (e) { /* ignore */ }
    }

    // ===== 字体选择 =====
    function buildTextColorSwatches() {
        const container = dom.textColorSwatches;
        if (!container) return;
        container.innerHTML = '';
        TEXT_COLORS.forEach(c => {
            const swatch = document.createElement('button');
            const isActive = currentTextColor === c.value || (!currentTextColor && c.value === '#333333');
            swatch.className = 'text-color-swatch' + (isActive ? ' active' : '');
            swatch.dataset.color = c.value;
            swatch.title = c.label;
            swatch.style.background = c.value;
            swatch.addEventListener('click', () => switchTextColor(c.value));
            container.appendChild(swatch);
        });
    }

    function switchTextColor(color) {
        currentTextColor = color;
        dom.textColorSwatches?.querySelectorAll('.text-color-swatch').forEach(el => {
            el.classList.toggle('active', el.dataset.color === color);
        });
        renderPreview();
        try {
            localStorage.setItem('resume-builder-text-color', color);
        } catch (e) { /* ignore */ }
    }

    function switchFont(fontFamily) {
        currentFontFamily = fontFamily;
        renderPreview();
        try {
            localStorage.setItem('resume-builder-font-family', fontFamily);
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
            localStorage.removeItem('resume-builder-color-theme');
            localStorage.removeItem('resume-builder-font-family');
            localStorage.removeItem('resume-builder-text-color');
        } catch (e) { /* ignore */ }
        currentData = getDefaultData();
        currentFontFamily = '';
        currentTextColor = '';
        dom.fontSelect.value = '';
        populateForm(currentData);
        buildTextColorSwatches();
        renderPreview();
        dom.saveStatus.textContent = '已重置';
        dom.saveStatus.className = 'save-status';
    }

    // ===== 导入 PDF =====
    let _pendingImportResult = null; // 暂存解析结果，等待用户选择模板

    function importPDF() {
        dom.pdfFileInput.click();
    }

    function handlePDFFileSelected(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // 显示加载遮罩
        showLoading('正在解析 PDF...', 5);

        PDFImporter.importPDF(file, {
            onProgress: (msg, pct) => {
                showLoading(msg, pct);
            },
            onComplete: (result) => {
                hideLoading();
                // 暂存结果，弹出模板选择框让用户决定用哪个模板
                _pendingImportResult = result;
                showImportChoice();
            },
            onError: (errMsg) => {
                hideLoading();
                dom.pdfFileInput.value = '';
                alert('❌ PDF 导入失败：\n' + errMsg + '\n\n提示：本功能需要 PDF 文件包含可选文字内容。如果是扫描件（图片型PDF），请先 OCR 转换。');
            },
        });
    }

    // ===== PDF 导入模板选择弹窗 =====
    function showImportChoice() {
        if (!dom.importChoiceOverlay) return;

        // 动态填充内置模板下拉（含之前导入的模板）
        populateChoiceTemplateSelect();

        // 默认选中「自动生成的模板」
        document.querySelector('input[name="importTemplate"][value="imported"]').checked = true;
        dom.choiceBuiltinPicker.style.display = 'none';

        dom.importChoiceOverlay.style.display = 'flex';
    }

    function hideImportChoice() {
        if (!dom.importChoiceOverlay) return;
        dom.importChoiceOverlay.style.display = 'none';
    }

    function populateChoiceTemplateSelect() {
        if (!dom.choiceTemplateSelect) return;
        const currentVal = dom.choiceTemplateSelect.value;
        dom.choiceTemplateSelect.innerHTML = '';
        Templates.getList().forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            dom.choiceTemplateSelect.appendChild(opt);
        });
        if (Templates.registry[currentVal]) {
            dom.choiceTemplateSelect.value = currentVal;
        }
    }

    function confirmImportChoice() {
        if (!_pendingImportResult) return;

        const result = _pendingImportResult;
        const selected = document.querySelector('input[name="importTemplate"]:checked')?.value;

        // 1. 填充数据
        currentData = result.data;
        populateForm(result.data);

        // 2. 确定使用哪个模板
        let targetTemplateId;
        let isImported = false;

        if (selected === 'imported') {
            // 使用自动生成的模板
            addTemplateToSelect(result.templateId, result.templateName);
            targetTemplateId = result.templateId;
            isImported = true;
        } else {
            // 使用用户从下拉框选的模板
            targetTemplateId = dom.choiceTemplateSelect.value;
        }

        // 3. 切换模板
        dom.templateSelect.value = targetTemplateId;
        switchTemplate(targetTemplateId);

        // 4. 隐藏配色选择器（导入的模板不支持）
        if (dom.themePicker) {
            const isThemeable = targetTemplateId === 'professional' || targetTemplateId === 'modern';
            dom.themePicker.style.display = isThemeable ? 'flex' : 'none';
        }

        // 5. 保存
        scheduleSave(currentData);

        // 6. 重置
        dom.pdfFileInput.value = '';
        _pendingImportResult = null;
        hideImportChoice();

        // 7. 提示
        const templateName = Templates.registry[targetTemplateId]?.name || targetTemplateId;
        dom.saveStatus.textContent = `✅ 已导入 (${templateName})`;
        dom.saveStatus.className = 'save-status';
        setTimeout(() => {
            dom.saveStatus.textContent = '已保存';
        }, 2500);
    }

    function showLoading(msg, pct) {
        if (!dom.loadingOverlay) return;
        dom.loadingOverlay.style.display = 'flex';
        if (dom.loadingText) dom.loadingText.textContent = msg || '处理中...';
        if (dom.loadingProgress) {
            dom.loadingProgress.style.width = Math.min(100, Math.max(0, pct || 0)) + '%';
        }
    }

    function hideLoading() {
        if (!dom.loadingOverlay) return;
        dom.loadingOverlay.style.display = 'none';
    }

    // ===== 动态模板下拉 =====
    function populateTemplateSelect() {
        if (!dom.templateSelect) return;
        const currentVal = dom.templateSelect.value;
        dom.templateSelect.innerHTML = '';
        Templates.getList().forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            dom.templateSelect.appendChild(opt);
        });
        // 恢复选中值
        if (Templates.registry[currentVal]) {
            dom.templateSelect.value = currentVal;
        }
    }

    function addTemplateToSelect(templateId, templateName) {
        if (!dom.templateSelect) return;
        // 检查是否已存在
        const existing = dom.templateSelect.querySelector(`option[value="${templateId}"]`);
        if (existing) {
            existing.textContent = templateName;
            return;
        }
        const opt = document.createElement('option');
        opt.value = templateId;
        opt.textContent = templateName;
        dom.templateSelect.appendChild(opt);
    }
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===== textarea 自适应高度 =====
    function autoResizeTextarea() {
        if (this && this.tagName === 'TEXTAREA') {
            this.style.height = 'auto';
            this.style.height = Math.max(this.scrollHeight, 40) + 'px';
        }
    }

    // ===== 自动切换 input ↔ textarea =====
    function ensureAppropriateInput(el, currentValue) {
        if (!el) return;
        const needsTextarea = currentValue.length > 20 || currentValue.includes('\n');
        const isTextarea = el.tagName === 'TEXTAREA';
        if (needsTextarea && !isTextarea) {
            const ta = document.createElement('textarea');
            ta.className = el.className + ' skill-textarea';
            ta.name = el.name;
            ta.rows = 2;
            ta.placeholder = el.placeholder;
            ta.value = currentValue;
            el.parentNode.replaceChild(ta, el);
            ta.addEventListener('input', () => {
                onFormChange();
                setTimeout(() => autoResizeTextarea.call(ta), 0);
            });
            setTimeout(() => autoResizeTextarea.call(ta), 0);
            return ta;
        } else if (!needsTextarea && isTextarea && !currentValue.includes('\n')) {
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = el.className.replace(/ skill-textarea/g, '');
            inp.name = el.name;
            inp.placeholder = el.placeholder;
            inp.value = currentValue;
            el.parentNode.replaceChild(inp, el);
            inp.addEventListener('input', onFormChange);
            return inp;
        }
        return el;
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

        // 模板切换（合并主题色块刷新）
        dom.templateSelect?.addEventListener('change', (e) => {
            switchTemplate(e.target.value);
            const val = e.target.value;
            // 只有支持的模板才显示配色选择器
            if (dom.themePicker) {
                dom.themePicker.style.display = (val === 'professional' || val === 'modern') ? 'flex' : 'none';
            }
            // 刷新主题色块（如果显示的话）
            if (dom.themePicker && dom.themePicker.style.display !== 'none') {
                buildThemeSwatches();
            }
        });

        // 字体选择
        dom.fontSelect?.addEventListener('change', (e) => {
            switchFont(e.target.value);
        });

        // 导出
        dom.exportBtn?.addEventListener('click', exportPDF);

        // PDF 导入
        dom.importPdfBtn?.addEventListener('click', importPDF);
        dom.pdfFileInput?.addEventListener('change', handlePDFFileSelected);

        // PDF 导入 — 模板选择弹窗
        dom.choiceConfirmBtn?.addEventListener('click', confirmImportChoice);
        dom.choiceCancelBtn?.addEventListener('click', () => {
            hideImportChoice();
            dom.pdfFileInput.value = '';
            _pendingImportResult = null;
        });
        // 单选切换：显示/隐藏内置模板下拉
        dom.choiceImported?.addEventListener('click', () => {
            document.querySelector('input[name="importTemplate"][value="imported"]').checked = true;
            dom.choiceBuiltinPicker.style.display = 'none';
        });
        dom.choiceBuiltin?.addEventListener('click', () => {
            document.querySelector('input[name="importTemplate"][value="builtin"]').checked = true;
            dom.choiceBuiltinPicker.style.display = 'flex';
        });

        // 重置
        dom.resetBtn?.addEventListener('click', resetAll);

        // 自定义模块
        dom.addCustomModuleBtn?.addEventListener('click', showCreateModuleModal);
        dom.cmConfirmBtn?.addEventListener('click', confirmCreateModule);
        dom.cmCancelBtn?.addEventListener('click', hideCreateModuleModal);
        // 预设按钮
        document.querySelectorAll('.cm-preset').forEach(btn => {
            btn.addEventListener('click', function() {
                const fields = this.dataset.fields;
                if (fields && dom.cmFields) dom.cmFields.value = fields.replace(/\\n/g, '\n');
            });
        });

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

        // 动态填充模板下拉框
        populateTemplateSelect();

        // 加载保存的模板偏好
        try {
            const savedTmpl = localStorage.getItem('resume-builder-template');
            if (savedTmpl && Templates.registry[savedTmpl]) {
                dom.templateSelect.value = savedTmpl;
                currentTemplate = savedTmpl;
            }
        } catch (e) { /* ignore */ }

        // 加载保存的配色主题偏好
        try {
            const savedTheme = localStorage.getItem('resume-builder-color-theme');
            if (savedTheme && ColorThemes[savedTheme]) {
                currentColorTheme = savedTheme;
            }
        } catch (e) { /* ignore */ }

        // 加载保存的字体偏好
        try {
            const savedFont = localStorage.getItem('resume-builder-font-family');
            if (savedFont) {
                currentFontFamily = savedFont;
                dom.fontSelect.value = savedFont;
            }
        } catch (e) { /* ignore */ }

        // 加载保存的文字颜色偏好
        try {
            const savedColor = localStorage.getItem('resume-builder-text-color');
            if (savedColor) {
                currentTextColor = savedColor;
            }
        } catch (e) { /* ignore */ }

        // 构建配色选择器
        buildThemeSwatches();
        // 构建文字颜色选择器
        buildTextColorSwatches();
        // 根据当前模板显示/隐藏配色选择器（专业商务和现代清新支持；导入模板暂不支持）
        if (dom.themePicker) {
            const isThemeable = currentTemplate === 'professional' || currentTemplate === 'modern';
            dom.themePicker.style.display = isThemeable ? 'flex' : 'none';
        }

        // 加载保存的数据
        const hasSaved = loadSavedData();
        if (!hasSaved) {
            // 第一次使用，填充示例数据
            currentData = getSampleData();
            populateForm(currentData);
        }

        // 初始化搜索过滤
        initFilters();

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
            customSections: [
                { id: 'cm-demo-1', title: '证书', fields: [{ name: 'name', label: '证书名称', type: 'text' }, { name: 'org', label: '颁发机构', type: 'text' }, { name: 'date', label: '获得时间', type: 'text' }], entries: [
                    { name: 'PMP项目管理', org: 'PMI', date: '2023-06' },
                    { name: 'AWS Solutions Architect', org: 'Amazon', date: '2022-12' },
                ]},
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
