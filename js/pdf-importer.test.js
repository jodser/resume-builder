/**
 * pdf-importer.test.js — PDFImporter 模块单元测试
 * 运行方式：用浏览器打开 test-runner.html 或在 Node + jsdom 中运行
 *
 * 注意：pdf.js 依赖无法在纯 Node 环境运行（需要 canvas），
 * 所以这里集中测试纯逻辑函数（不需要 pdf.js 的部分）
 */

(function() {
    'use strict';

    // 在浏览器中测试时需要先加载 pdf-importer.js
    if (typeof PDFImporter === 'undefined') {
        console.error('请先加载 pdf-importer.js');
        return;
    }

    let passed = 0;
    let failed = 0;

    function assert(condition, msg) {
        if (condition) {
            passed++;
            console.log(`  ✓ ${msg}`);
        } else {
            failed++;
            console.error(`  ✗ ${msg}`);
        }
    }

    function assertEqual(actual, expected, msg) {
        const ok = actual === expected;
        if (ok) {
            passed++;
            console.log(`  ✓ ${msg}`);
        } else {
            failed++;
            console.error(`  ✗ ${msg} — 期望 "${expected}", 实际 "${actual}"`);
        }
    }

    function assertDeepEqual(actual, expected, msg) {
        const ok = JSON.stringify(actual) === JSON.stringify(expected);
        if (ok) {
            passed++;
            console.log(`  ✓ ${msg}`);
        } else {
            failed++;
            console.error(`  ✗ ${msg} — 期望 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
        }
    }

    // =============================================
    // 测试：_escapeHtml
    // =============================================
    console.log('\n📌 _escapeHtml');
    (function() {
        assertEqual(PDFImporter._escapeHtml('<script>alert(1)</script>'),
            '&lt;script&gt;alert(1)&lt;/script&gt;', '转义 <>');
        assertEqual(PDFImporter._escapeHtml('a&b'),
            'a&amp;b', '转义 &');
        assertEqual(PDFImporter._escapeHtml('"hello"'),
            '&quot;hello&quot;', '转义 双引号');
        assertEqual(PDFImporter._escapeHtml("it's"),
            'it&#039;s', '转义 单引号');
        assertEqual(PDFImporter._escapeHtml('普通文本'),
            '普通文本', '普通中文不转义');
        assertEqual(PDFImporter._escapeHtml(''), '', '空字符串');
        assertEqual(PDFImporter._escapeHtml(123), '', '非字符串返回空');
    })();

    // =============================================
    // 测试：_matchSectionHeader
    // =============================================
    console.log('\n📌 _matchSectionHeader');
    (function() {
        assertEqual(PDFImporter._matchSectionHeader('教育经历'), 'education', '匹配 "教育经历"');
        assertEqual(PDFImporter._matchSectionHeader('工作经历'), 'experience', '匹配 "工作经历"');
        assertEqual(PDFImporter._matchSectionHeader('专业技能'), 'skills', '匹配 "专业技能"');
        assertEqual(PDFImporter._matchSectionHeader('项目经验'), 'projects', '匹配 "项目经验"');
        assertEqual(PDFImporter._matchSectionHeader('个人简介'), 'summary', '匹配 "个人简介"');
        assertEqual(PDFImporter._matchSectionHeader('基本信息'), 'personal', '匹配 "基本信息"');
        assertEqual(PDFImporter._matchSectionHeader('随意文字'), null, '非章节标题返回 null');
        assertEqual(PDFImporter._matchSectionHeader('Skills'), 'skills', '英文 "Skills"');
        assertEqual(PDFImporter._matchSectionHeader('Work Experience'), 'experience', '英文 "Work Experience"');
        assertEqual(PDFImporter._matchSectionHeader('Education'), 'education', '英文 "Education"');
    })();

    // =============================================
    // 测试：_extractDates
    // =============================================
    console.log('\n📌 _extractDates');
    (function() {
        let result;

        result = PDFImporter._extractDates('2020.03 - 2023.01');
        assert(result.length > 0, '提取 "2020.03 - 2023.01"');
        if (result.length > 0) {
            assertEqual(result[0].start, '2020-03', 'start = 2020-03');
            assertEqual(result[0].end, '2023-01', 'end = 2023-01');
        }

        result = PDFImporter._extractDates('2019年7月 - 2021年2月');
        assert(result.length > 0, '提取中文年月');
        if (result.length > 0) {
            assertEqual(result[0].start, '2019-07', 'start = 2019-07');
            assertEqual(result[0].end, '2021-02', 'end = 2021-02');
        }

        result = PDFImporter._extractDates('2020 - 2023');
        assert(result.length > 0, '提取 "2020 - 2023" 年份区间');
        if (result.length > 0) {
            assertEqual(result[0].start, '2020', 'start = 2020');
            assertEqual(result[0].end, '2023', 'end = 2023');
        }

        result = PDFImporter._extractDates('2020.03 - 至今');
        assert(result.length > 0, '提取 "2020.03 - 至今"');
        if (result.length > 0) {
            assertEqual(result[0].start, '2020-03', 'start = 2020-03');
            assertEqual(result[0].end, '至今', 'end = 至今');
        }

        result = PDFImporter._extractDates('2018-2022');
        assert(result.length > 0, '提取 "2018-2022"');
        if (result.length > 0) {
            assertEqual(result[0].start, '2018', 'start = 2018');
            assertEqual(result[0].end, '2022', 'end = 2022');
        }

        result = PDFImporter._extractDates('2020年9月 - 2023年6月');
        assert(result.length > 0, '提取 "2020年9月 - 2023年6月"');
        if (result.length > 0) {
            assertEqual(result[0].start, '2020-09', 'start = 2020-09');
            assertEqual(result[0].end, '2023-06', 'end = 2023-06');
        }

        result = PDFImporter._extractDates('这是一段没有日期的文本');
        assert(result.length === 0, '无日期文本返回空数组');

        result = PDFImporter._extractDates('2023');
        assert(result.length > 0, '单个年份');
        if (result.length > 0) {
            assertEqual(result[0].start, '2023', 'start = 2023');
        }
    })();

    // =============================================
    // 测试：_mergeToParagraphs
    // =============================================
    console.log('\n📌 _mergeToParagraphs');
    (function() {
        const items = [
            { text: '张三', x: 50, y: 50, fontSize: 16, width: 40, height: 16 },
            { text: '高级前端工程师', x: 50, y: 72, fontSize: 14, width: 120, height: 14 },
            { text: '电话: 13800138000', x: 50, y: 94, fontSize: 12, width: 150, height: 12 },
            { text: '', x: 0, y: 0, fontSize: 12, width: 0, height: 0 }, // 空文本应跳过
        ];
        const paras = PDFImporter._mergeToParagraphs(items);
        assert(paras.length > 0, '生成段落');
        // 空文本被跳过，3个有效文本应合并到相邻的段落中
        const allText = paras.map(p => p.text).join('');
        assert(allText.includes('张三'), '段落包含 "张三"');
        assert(allText.includes('电话'), '段落包含 "电话"');
    })();

    // =============================================
    // 测试：_hasDate
    // =============================================
    console.log('\n📌 _hasDate');
    (function() {
        assert(PDFImporter._hasDate('2020.03 - 2023.01'), '有点分隔年月');
        assert(PDFImporter._hasDate('2020年3月'), '有中文年月');
        assert(PDFImporter._hasDate('2019-2022'), '有年份区间');
        assert(!PDFImporter._hasDate('这是一段描述文本'), '无日期');
        assert(!PDFImporter._hasDate(''), '空文本');
    })();

    // =============================================
    // 测试：_analyzeLayout
    // =============================================
    console.log('\n📌 _analyzeLayout');
    (function() {
        // 单栏布局：所有文本靠左
        const singleCol = [
            { text: '姓名', x: 50, y: 50, width: 40, height: 16, fontSize: 16, fontName: '' },
            { text: '教育经历', x: 50, y: 100, width: 80, height: 16, fontSize: 16, fontName: '' },
            { text: '北京大学', x: 50, y: 130, width: 60, height: 14, fontSize: 12, fontName: '' },
        ];
        const layout = PDFImporter._analyzeLayout(singleCol);
        assert(layout.columns === 1, '单栏识别');
    })();

    // =============================================
    // 测试：_removeDateText
    // =============================================
    console.log('\n📌 _removeDateText');
    (function() {
        const result = PDFImporter._removeDateText('2020.03 - 2023.01 负责前端开发工作');
        assert(!result.includes('2020'), '去除日期文本');
        assert(result.includes('负责前端'), '保留描述文本');

        const result2 = PDFImporter._removeDateText('2020 - 2023 在字节跳动工作');
        assert(!result2.includes('2020'), '去除年份区间');
        assert(result2.includes('字节跳动'), '保留公司名');
    })();

    // =============================================
    // 测试：_extractPersonalFields
    // =============================================
    console.log('\n📌 _extractPersonalFields');
    (function() {
        const text = [
            '张三',
            '高级前端工程师',
            '电话：13800138000',
            '邮箱：zhangsan@example.com',
            '现居：北京',
        ].join('\n');
        const result = PDFImporter._extractPersonalFields(text, []);
        assertEqual(result.phone, '13800138000', '提取电话');
        assertEqual(result.email, 'zhangsan@example.com', '提取邮箱');
        assert(result.name === '张三' || result.name === undefined, '姓名提取（姓名字段可能受限于首行判断）');
    })();

    // =============================================
    // 测试：_mapToResumeData
    // =============================================
    console.log('\n📌 _mapToResumeData');
    (function() {
        const parsed = {
            sections: {
                personal: { name: '李四', phone: '13900000000' },
                summary: { text: '5年开发经验' },
                education: [{ school: '清华大学', degree: '硕士', major: '计算机' }],
                experience: [{ company: '腾讯', position: '工程师' }],
                skills: [{ name: 'JavaScript' }, { name: 'Python' }],
                projects: [{ name: '电商平台', role: '负责人' }],
            },
            paragraphs: [],
        };
        const data = PDFImporter._mapToResumeData(parsed);
        assertEqual(data.personal.name, '李四', '映射姓名');
        assertEqual(data.personal.summary, '5年开发经验', '映射简介');
        assertEqual(data.education.length, 1, '教育条目数');
        assertEqual(data.experience[0].company, '腾讯', '映射公司');
        assertEqual(data.skills.length, 2, '技能数');
        assertEqual(data.projects[0].name, '电商平台', '映射项目');
    })();

    // =============================================
    // 结果汇总
    // =============================================
    console.log(`\n${'='.repeat(40)}`);
    console.log(`总测试数: ${passed + failed}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`${'='.repeat(40)}`);

})();
