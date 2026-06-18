/**
 * pdf-importer.js — PDF 简历导入模块
 * 使用 pdf.js 解析 PDF → 启发式提取结构化数据 → 自动生成 CSS 模板
 * 纯浏览器端，无需后端服务
 */

const PDFImporter = {
    // 已导入模板计数（用于命名）
    _importCount: 0,

    /**
     * HTML 转义 — 防止 XSS
     */
    _escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },

    // 常用中文简历章节关键词
    SECTION_KEYWORDS: {
        personal: [/个人信息/i, /基本信息/i, /基本资料/i, /个人资料/i],
        summary: [/个人简介/i, /自我评价/i, /个人评价/i, /关于我/i, /简介/i, /自我描述/i],
        education: [/教育经历/i, /教育背景/i, /学历/i, /学习经历/i, /教育/i],
        experience: [/工作经历/i, /工作经验/i, /实习经历/i, /从业经历/i, /工作履历/i],
        skills: [/专业技能/i, /技能/i, /技术能力/i, /个人技能/i, /职业技能/i, /核心能力/i],
        projects: [/项目经历/i, /项目经验/i, /项目/i, /项目成果/i],
    },

    // 个人信息字段关键词
    FIELD_PATTERNS: {
        name: [/姓[名氏]/, /Name/i],
        phone: [
            /1[3-9]\d{9}/g,                          // 中国大陆手机号
            /(\+\d{1,3}[-\s]?)?\d{7,14}/g,            // 国际电话
            /电话[：:]?\s*([\d-+()（）\s]{7,15})/,
            /手机[：:]?\s*(1[3-9]\d{9})/,
            /Tel[eo]?[：:]?\s*([\d-+()（）\s]{7,15})/i,
        ],
        email: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
        location: [
            /(?:地址|现居|所在地|居住地|城市)[：:]?\s*([^\s,，。]{2,10})/,
            /所在[地城市][：:]?\s*([^\s,，。]{2,10})/,
        ],
    },

    /**
     * 主入口：加载 PDF 文件 → 解析 → 提取数据 → 生成模板 → 回调
     * @param {File} file - 用户选择的 PDF 文件
     * @param {Object} callbacks - { onProgress, onComplete, onError }
     */
    async importPDF(file, callbacks = {}) {
        const { onProgress = () => {}, onComplete = () => {}, onError = () => {} } = callbacks;

        try {
            onProgress('正在加载 PDF 文件...', 10);

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            onProgress(`PDF 加载完成（共 ${pdf.numPages} 页），正在提取文字...`, 30);

            // 提取所有页的文本项（带位置信息）
            const allTextItems = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });

                textContent.items.forEach(item => {
                    allTextItems.push({
                        text: item.str,
                        x: item.transform[4],
                        y: viewport.height - item.transform[5], // 转为从上到下
                        width: item.width,
                        height: item.height || item.fontSize || 12,
                        fontSize: item.fontSize || 12,
                        fontName: item.fontName || '',
                        page: i,
                    });
                });
            }

            if (allTextItems.length === 0) {
                throw new Error('未能从 PDF 中提取到文字内容，请确认 PDF 包含可选文字（非扫描件）');
            }

            onProgress('正在提取图片并分析版面...', 45);

            // 提取页面图片（头像/缩略图）
            const imageInfo = await this._extractImages(pdf);

            onProgress('正在分析版面布局...', 55);

            // 分析布局（含图片信息）
            const layoutInfo = this._analyzeLayout(allTextItems);
            // 合并图片信息
            layoutInfo.avatarDataUrl = imageInfo.avatar;
            layoutInfo.avatarRect = imageInfo.avatarRect;
            layoutInfo.pageThumbnails = imageInfo.pageThumbnails;

            onProgress('正在识别简历章节...', 65);

            // 解析结构化内容
            const parsed = this._parseContent(allTextItems, layoutInfo);

            onProgress('正在映射数据字段...', 75);

            // 映射到数据结构
            const resumeData = this._mapToResumeData(parsed);

            // 自动填充检测到的头像
            if (imageInfo && imageInfo.avatar && !resumeData.personal.avatar) {
                resumeData.personal.avatar = imageInfo.avatar;
            }

            onProgress('正在生成模板样式...', 85);

            // 生成模板（包含头像页面引用）
            const templateId = this._generateTemplate(parsed, layoutInfo, file.name);

            onProgress(`导入完成！识别到 ${Object.keys(parsed.sections).length} 个章节${imageInfo.avatar ? ' + 头像' : ''}`, 100);

            onComplete({
                data: resumeData,
                templateId: templateId,
                templateName: `📄 ${file.name.replace(/\.pdf$/i, '')}`,
                layoutInfo: layoutInfo,
                parsed: parsed,
                hasAvatar: !!imageInfo.avatar,
            });

        } catch (err) {
            console.error('PDF 导入失败:', err);
            onError(err.message || 'PDF 解析失败，请确认文件格式正确');
        }
    },

    // ── 图片提取配置 ──
    IMAGE_CONFIG: {
        // 头像检测：扫描页面上半部分的网格密度
        GRID_COLS: 30,
        GRID_ROWS: 24,
        SEARCH_HEIGHT_RATIO: 0.55, // 只扫描页面上 55%
        AVATAR_MIN_SIZE: 0.04,     // 最小头像宽高/页宽比
        AVATAR_MAX_SIZE: 0.35,     // 最大头像宽高/页宽比
        THUMBNAIL_SCALE: 0.15,     // 缩略图缩放比
        DETECT_SCALE: 0.3,         // 检测渲染缩放
        AVATAR_CONFIDENCE: 2.5,    // 头像置信度阈值
    },

    /**
     * === 图片提取引擎 ===
     * 渲染 PDF 页面 → 检测头像/照片 → 生成缩略图
     * @param {Object} pdf - pdf.js 文档对象
     * @returns {Object} { avatar: dataURL|null, pageThumbnails: [dataURL], avatarRect: null|{x,y,w,h} }
     */
    async _extractImages(pdf) {
        const cfg = this.IMAGE_CONFIG;
        const result = { avatar: null, pageThumbnails: [], avatarRect: null };

        if (pdf.numPages === 0) return result;

        // ── 渲染第 1 页用于头像检测 ──
        try {
            const page = await pdf.getPage(1);

            // 1. 以较低分辨率渲染，用于头像检测
            const vpOrig = page.getViewport({ scale: 1 });
            const detectScale = Math.min(cfg.DETECT_SCALE, 300 / Math.max(vpOrig.width, vpOrig.height));
            const vpDetect = page.getViewport({ scale: detectScale });
            const cDetect = document.createElement('canvas');
            cDetect.width = vpDetect.width;
            cDetect.height = vpDetect.height;
            const ctxDetect = cDetect.getContext('2d');
            await page.render({ canvasContext: ctxDetect, viewport: vpDetect }).promise;

            // 2. 在页面上半部分网格扫描检测头像
            const detected = this._detectAvatarFromCanvas(ctxDetect, vpDetect.width, vpDetect.height, detectScale);
            if (detected) {
                result.avatar = detected.dataUrl;
                result.avatarRect = detected.rect;
            }

            // 3. 生成所有页面的缩略图
            for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                const p = i === 1 ? page : await pdf.getPage(i);
                const thumbScale = cfg.THUMBNAIL_SCALE;
                const vpThumb = p.getViewport({ scale: thumbScale });
                const cThumb = document.createElement('canvas');
                cThumb.width = vpThumb.width;
                cThumb.height = vpThumb.height;
                const ctxThumb = cThumb.getContext('2d');
                await p.render({ canvasContext: ctxThumb, viewport: vpThumb }).promise;
                result.pageThumbnails.push(cThumb.toDataURL('image/jpeg', 0.6));
            }
        } catch (e) {
            console.warn('PDF 图片提取失败（不影响文字导入）:', e.message);
        }

        return result;
    },

    /**
     * === 网格化头像检测 ===
     * 将页面分成网格，对每格计算「照片特征分」，聚类高分区找出头像
     */
    _detectAvatarFromCanvas(ctx, canvasW, canvasH, scale) {
        const cfg = this.IMAGE_CONFIG;
        const searchH = Math.floor(canvasH * cfg.SEARCH_HEIGHT_RATIO);
        const cols = cfg.GRID_COLS;
        const rows = Math.floor(cols * (searchH / canvasW));
        const cellW = canvasW / cols;
        const cellH = searchH / rows;

        const imageData = ctx.getImageData(0, 0, canvasW, searchH);
        const data = imageData.data;
        const scores = [];

        // 对每个网格打分
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const x0 = Math.floor(gx * cellW);
                const y0 = Math.floor(gy * cellH);
                const cw = Math.ceil(cellW);
                const ch = Math.ceil(cellH);
                const score = this._scoreGridCell(data, canvasW, searchH, x0, y0, cw, ch);
                scores.push({ gx, gy, score, x: x0, y: y0, w: cw, h: ch });
            }
        }

        // 找高分网格的聚簇
        const threshold = this._findThreshold(scores);
        const highScores = scores.filter(s => s.score >= threshold);
        if (highScores.length < 4) return null;

        // 计算聚簇边界（取高分格子的外接矩形）
        const margin = 0;
        let minX = canvasW, minY = searchH, maxX = 0, maxY = 0;
        let totalScore = 0, weightedX = 0, weightedY = 0;
        for (const s of highScores) {
            if (s.score < threshold * 0.3) continue;
            minX = Math.min(minX, s.x);
            minY = Math.min(minY, s.y);
            maxX = Math.max(maxX, s.x + s.w);
            maxY = Math.max(maxY, s.y + s.h);
            totalScore += s.score;
            weightedX += s.score * (s.x + s.w / 2);
            weightedY += s.score * (s.y + s.h / 2);
        }

        // 清理误检：如果检测区域太宽（比例 > 1.6）则太可能是横幅而非头像
        const rectW = maxX - minX;
        const rectH = maxY - minY;
        const aspect = rectW / rectH;
        const avgConfidence = totalScore / highScores.length;

        if (aspect > 1.6 || aspect < 0.4 || avgConfidence < cfg.AVATAR_CONFIDENCE) {
            return null;
        }

        // 向外扩一点边距
        const padX = Math.round(rectW * 0.08);
        const padY = Math.round(rectH * 0.08);
        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(canvasW - cropX, maxX - minX + padX * 2);
        const cropH = Math.min(searchH - cropY, maxY - minY + padY * 2);

        // 确保至少为正方形
        const side = Math.max(cropW, cropH);
        const finalX = Math.max(0, cropX - (side - cropW) / 2);
        const finalY = Math.max(0, cropY - (side - cropH) / 2);
        const finalS = Math.min(side, canvasW - finalX, searchH - finalY);

        // 裁剪出头像 data URL
        const dataUrl = this._cropCanvas(ctx, finalX, finalY, finalS, finalS);

        if (!dataUrl) return null;

        // 换算回原始坐标
        const invScale = 1 / scale;
        return {
            dataUrl,
            rect: { x: Math.round(finalX * invScale), y: Math.round(finalY * invScale),
                    w: Math.round(finalS * invScale), h: Math.round(finalS * invScale) },
            confidence: avgConfidence,
        };
    },

    /**
     * 计算一个网格单元的「照片特征分」
     * 照片区域 = 高边缘密度 + 高色彩方差
     */
    _scoreGridCell(data, imgW, imgH, x0, y0, w, h) {
        const maxY = Math.min(y0 + h, imgH);
        const maxX = Math.min(x0 + w, imgW);
        let edgeSum = 0, pixelCount = 0;
        let rSum = 0, gSum = 0, bSum = 0;
        let r2Sum = 0, g2Sum = 0, b2Sum = 0;
        let nonWhiteCount = 0;

        for (let py = y0; py < maxY; py++) {
            for (let px = x0; px < maxX; px++) {
                const idx = (py * imgW + px) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
                if (a < 128) continue;
                pixelCount++;

                // 非白色/背景像素计数
                const isWhite = r > 240 && g > 240 && b > 240;
                const isGray = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 200;
                if (!isWhite && !isGray) nonWhiteCount++;

                rSum += r; gSum += g; bSum += b;
                r2Sum += r * r; g2Sum += g * g; b2Sum += b * b;

                // 简化的边缘检测：3x3 邻域梯度
                if (px > 0 && py > 0 && px < imgW - 1 && py < imgH - 1) {
                    const li = ((py) * imgW + (px - 1)) * 4;
                    const ri = ((py) * imgW + (px + 1)) * 4;
                    const ti = ((py - 1) * imgW + (px)) * 4;
                    const bi = ((py + 1) * imgW + (px)) * 4;
                    const dx = Math.abs(data[li] - data[ri]) + Math.abs(data[li+1] - data[ri+1]) + Math.abs(data[li+2] - data[ri+2]);
                    const dy = Math.abs(data[ti] - data[bi]) + Math.abs(data[ti+1] - data[bi+1]) + Math.abs(data[ti+2] - data[bi+2]);
                    edgeSum += (dx + dy) / 6;
                }
            }
        }

        if (pixelCount < 10) return 0;

        // 色彩方差（照片色彩丰富，方差大）
        const rVar = r2Sum / pixelCount - (rSum / pixelCount) ** 2;
        const gVar = g2Sum / pixelCount - (gSum / pixelCount) ** 2;
        const bVar = b2Sum / pixelCount - (bSum / pixelCount) ** 2;
        const avgVar = (rVar + gVar + bVar) / 3;

        // 非白色像素占比
        const colorRatio = nonWhiteCount / pixelCount;

        // 边缘密度
        const edgeDensity = edgeSum / pixelCount;

        // 综合评分
        return (Math.sqrt(avgVar) * 0.6) + (edgeDensity * 0.3) + (colorRatio * 20);
    },

    /**
     * 根据分数分布自动计算阈值（取高分段的底部）
     */
    _findThreshold(scores) {
        const sorted = [...scores].sort((a, b) => b.score - a.score);
        const topCount = Math.max(5, Math.floor(sorted.length * 0.15));
        const topScores = sorted.slice(0, topCount);
        const avg = topScores.reduce((s, sc) => s + sc.score, 0) / topScores.length;
        return avg * 0.35;
    },

    /**
     * 从 canvas 裁剪区域并返回 data URL，自动转为正方形
     */
    _cropCanvas(ctx, x, y, w, h) {
        try {
            const side = Math.round(Math.max(w, h));
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = side;
            cropCanvas.height = side;
            const cropCtx = cropCanvas.getContext('2d');
            // 绘制时居中裁切
            const sx = Math.round(x - (side - w) / 2);
            const sy = Math.round(y - (side - h) / 2);
            cropCtx.drawImage(ctx.canvas, sx, sy, side, side, 0, 0, side, side);
            return cropCanvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            console.warn('裁剪图片失败:', e.message);
            return null;
        }
    },
    _analyzeLayout(textItems) {
        if (textItems.length === 0) return { columns: 1 };

        // ── 基本度量 ──
        const pageWidth = Math.max(...textItems.map(t => t.x + t.width)) + 20;
        const pageHeight = Math.max(...textItems.map(t => t.y + t.height)) + 20;

        // ── 字体分析 ──
        const fontMap = {}; // fontName -> count
        textItems.forEach(t => {
            const key = t.fontName || 'default';
            fontMap[key] = (fontMap[key] || 0) + 1;
        });
        const fontEntries = Object.entries(fontMap).sort((a, b) => b[1] - a[1]);
        const bodyFontName = fontEntries[0]?.[0] || 'sans-serif';

        // 按字号分组
        const sizeGroups = {};
        textItems.forEach(t => {
            const sz = Math.round(t.fontSize * 2) / 2; // 四舍五入到 0.5
            if (!sizeGroups[sz]) sizeGroups[sz] = [];
            sizeGroups[sz].push(t);
        });
        const sizeEntries = Object.entries(sizeGroups)
            .map(([k, v]) => ({ size: parseFloat(k), count: v.length, items: v }))
            .sort((a, b) => b.count - a.count);

        const medianFontSize = sizeEntries[0]?.size || 12;
        // 找标题字号（比正文大30%以上且有一定数量）
        const headerCandidates = sizeEntries.filter(e =>
            e.size >= medianFontSize * 1.25 && e.count >= 2
        ).sort((a, b) => b.size - a.size);
        const headerFontSize = headerCandidates[0]?.size || medianFontSize * 1.4;

        // 找最大的字号（通常是姓名）
        const maxSizeEntry = sizeEntries[0];
        const nameFontSize = maxSizeEntry?.size || 22;

        // ── 字体分类 ──
        const serifFonts = ['Times', 'TimesNewRoman', 'Times New Roman', 'Georgia', 'Palatino', 'Songti',
                            'STSong', 'SimSun', 'Noto Serif', 'Source Han Serif', 'KaiTi', 'STKaiti',
                            'FangSong', 'STFangsong'];
        const monoFonts = ['Courier', 'Consolas', 'Monaco', 'monospace'];
        const isSerif = serifFonts.some(f => bodyFontName.toLowerCase().includes(f.toLowerCase()));
        const isMono = monoFonts.some(f => bodyFontName.toLowerCase().includes(f.toLowerCase()));
        const fontFamily = isSerif ? "'Times New Roman', 'Noto Serif SC', serif"
                        : isMono ? "'Courier New', Consolas, monospace"
                        : "'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";

        // ── 对齐分析 ──
        // 按行分组看x坐标分布
        const lineGroups = {};
        textItems.forEach(t => {
            const yKey = Math.round(t.y);
            if (!lineGroups[yKey]) lineGroups[yKey] = [];
            lineGroups[yKey].push(t);
        });
        let centerCount = 0, leftCount = 0, totalLines = 0;
        for (const [y, items] of Object.entries(lineGroups)) {
            if (items.length < 2) continue;
            totalLines++;
            const avgX = items.reduce((s, i) => s + i.x, 0) / items.length;
            const pageCenter = pageWidth / 2;
            // 如果一行中的文本大致居中分布（平均x接近页面中心，且各元素偏离中心不大）
            const isCentered = items.every(i => Math.abs(i.x + i.width / 2 - pageCenter) < pageWidth * 0.2);
            if (isCentered) centerCount++;
            if (avgX < pageWidth * 0.15) leftCount++;
        }
        const centerRatio = totalLines > 0 ? centerCount / totalLines : 0;
        const alignment = centerRatio > 0.4 ? 'center' : 'left';

        // ── 边距估算 ──
        const minX = Math.min(...textItems.map(t => t.x));
        const minY = Math.min(...textItems.map(t => t.y));
        const maxX = Math.max(...textItems.map(t => t.x + t.width));
        const maxY = Math.max(...textItems.map(t => t.y + t.height));
        const marginLeft = Math.max(8, minX);
        const marginRight = Math.max(8, pageWidth - maxX);
        const marginTop = Math.max(8, minY);
        const marginBottom = Math.max(8, pageHeight - maxY);
        const padding = Math.min(marginLeft, 40);
        const isCompact = marginLeft < 25 && marginTop < 20;

        // ── 行间距分析 ──
        const sortedY = textItems.map(t => t.y).sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < sortedY.length; i++) {
            const g = sortedY[i] - sortedY[i-1];
            if (g > 2 && g < 50) gaps.push(g);
        }
        const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
        const lineSpacing = avgGap / medianFontSize;
        const isTight = lineSpacing < 1.2;
        const isLoose = lineSpacing > 2.0;

        // ── 列数 ──
        const leftItems = textItems.filter(t => t.x < pageWidth * 0.4);
        const rightItems = textItems.filter(t => t.x > pageWidth * 0.55);
        const isTwoColumn = leftItems.length > 5 && rightItems.length > 5 &&
            (leftItems.length / rightItems.length) < 3 &&
            (rightItems.length / leftItems.length) < 3;
        const leftRatio = leftItems.length / (textItems.length || 1);

        // ── 标题风格检测 ──
        const headerThreshold = medianFontSize * 1.3;
        const headerItems = textItems.filter(t =>
            t.fontSize >= headerThreshold &&
            t.text.trim().length > 0 && t.text.trim().length < 35
        );
        const sectionHeaders = headerItems.filter(h => {
            const text = h.text.trim();
            const isKeyword = Object.values(this.SECTION_KEYWORDS).flat().some(kw => kw.test(text));
            const isLeftAligned = h.x < pageWidth * 0.35;
            return isKeyword || (isLeftAligned && h.fontSize >= medianFontSize * 1.5);
        });
        const hasUppercaseHeaders = sectionHeaders.some(h =>
            /^[A-Z\s]{3,}$/.test(h.text.trim())
        );
        const headerCount = sectionHeaders.length;

        // ── 分隔线检测 ──
        // 在section标题下方是否有横贯页面的文字（模拟检测：标题后的下一个文本x很小）
        let hasSectionLines = false;
        for (let i = 0; i < sectionHeaders.length; i++) {
            const h = sectionHeaders[i];
            const belowItems = textItems.filter(t =>
                t.y > h.y + h.fontSize && t.y < h.y + h.fontSize * 3 &&
                t.x < pageWidth * 0.15 && t.text.trim().length > 0
            );
            if (belowItems.length >= 1) {
                const nextY = belowItems[0].y;
                const gapSize = nextY - (h.y + h.fontSize);
                if (gapSize > 4 && gapSize < h.fontSize * 2) {
                    hasSectionLines = true;
                    break;
                }
            }
        }

        // ── 联系信息风格 ──
        const contactLines = Object.entries(lineGroups).filter(([y, items]) => {
            const text = items.map(i => i.text).join(' ');
            return /[\d@电话电话手机邮箱Email]/.test(text);
        });
        const hasInlineContact = contactLines.some(([y, items]) =>
            items.some(i => /(?:电话|手机|邮箱|@|Tel|Phone|Email)/i.test(i.text)) &&
            items.length >= 2
        );

        // ── 风格类型分类 ──
        let styleType = 'professional';
        if (isTwoColumn && leftRatio < 0.35) styleType = 'sidebar';
        else if (alignment === 'center') styleType = 'centered';
        else if (isCompact && headerCount >= 3) styleType = 'compact';
        else if (isSerif) styleType = 'classic';

        // ── 颜色方案推断 ──
        // pdf.js不直接提供颜色，但我们可以基于风格类型推荐合适的配色
        const colorSchemes = {
            professional: { header: '#1e293b', accent: '#2563eb', accentLight: '#dbeafe', text: '#374151', muted: '#64748b', border: '#e2e8f0' },
            sidebar:      { header: '#1e3a5f', accent: '#0ea5e9', accentLight: '#e0f2fe', text: '#334155', muted: '#94a3b8', border: '#e2e8f0' },
            centered:     { header: '#2d1b69', accent: '#7c3aed', accentLight: '#ede9fe', text: '#374151', muted: '#6b7280', border: '#e5e7eb' },
            compact:      { header: '#0f172a', accent: '#475569', accentLight: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#cbd5e1' },
            classic:      { header: '#1e293b', accent: '#4b5563', accentLight: '#f3f4f6', text: '#374151', muted: '#6b7280', border: '#d1d5db' },
        };
        const colors = colorSchemes[styleType] || colorSchemes.professional;

        // ── 头部背景检测 ──
        // 如果名字居中或字号特别大->可能有头部区块
        const hasHeaderBlock = alignment === 'center' || nameFontSize >= medianFontSize * 2.5;

        return {
            // 基本信息
            columns: isTwoColumn ? 2 : 1,
            isTwoColumn,
            pageWidth,
            pageHeight,

            // 字体
            fontFamily,
            bodyFontName,
            bodyFontSize: medianFontSize,
            headerFontSize,
            nameFontSize,
            isSerif,
            isMono,

            // 间距
            padding: Math.round(padding),
            isCompact,
            lineSpacing: lineSpacing.toFixed(1),
            isTight,
            isLoose,

            // 对齐
            alignment,
            centerRatio: centerRatio.toFixed(2),

            // 标题
            sectionHeaders: sectionHeaders.map(h => ({
                text: h.text.trim(), x: h.x, y: h.y, fontSize: h.fontSize
            })),
            headerCount,
            hasUppercaseHeaders,
            hasSectionLines,

            // 版式
            styleType,
            hasInlineContact,
            hasHeaderBlock,
            leftRatio: leftRatio.toFixed(2),

            // 配色推荐
            colors,

            // 原始度量
            marginLeft: Math.round(marginLeft),
            marginTop: Math.round(marginTop),
            medianFontSize,
        };
    },

    /**
     * 解析内容：将文本项按章节分组，并提取结构化信息
     */
    _parseContent(textItems, layoutInfo) {
        const sections = {};
        let currentSection = 'personal'; // 默认章节
        const allText = textItems.map(t => t.text.trim()).filter(t => t);

        // 合并文本为段落（按y坐标相近性）
        const paragraphs = this._mergeToParagraphs(textItems);

        // 第1遍：识别章节边界
        const sectionBoundaries = [];
        paragraphs.forEach((p, idx) => {
            const matched = this._matchSectionHeader(p.text);
            if (matched) {
                sectionBoundaries.push({ idx, section: matched, para: p });
            }
        });

        // 第2遍：分配段落到章节
        const rawSections = {};
        let activeSection = 'personal';
        let activeStart = 0;

        sectionBoundaries.forEach((boundary, i) => {
            // 前一个章节的内容
            const endIdx = boundary.idx;
            if (endIdx > activeStart) {
                rawSections[activeSection] = paragraphs.slice(activeStart, endIdx);
            }
            activeSection = boundary.section;
            activeStart = boundary.idx;
        });

        // 最后一个章节的内容
        if (activeStart < paragraphs.length) {
            const remaining = paragraphs.slice(activeStart);
            if (rawSections[activeSection]) {
                rawSections[activeSection] = rawSections[activeSection].concat(remaining);
            } else {
                rawSections[activeSection] = remaining;
            }
        }

        // 如果没有检测到任何章节，全部作为个人信息
        if (Object.keys(rawSections).length === 0) {
            rawSections.personal = paragraphs;
        }

        // 第3遍：对每个章节做细粒度字段提取
        for (const [section, paras] of Object.entries(rawSections)) {
            sections[section] = this._extractSectionFields(section, paras, textItems);
        }

        // 全文本用于字段补全
        const fullText = allText.join('\n');

        // 从全文中提取个人信息（因为可能在章节之外）
        const personalFields = this._extractPersonalFields(fullText, textItems);
        if (!sections.personal) sections.personal = {};
        sections.personal = { ...personalFields, ...sections.personal };

        return {
            sections,
            fullText,
            paragraphs: paragraphs.map(p => p.text),
            layoutInfo,
        };
    },

    /**
     * 将文本项合并为段落（基于y坐标接近）
     */
    _mergeToParagraphs(textItems) {
        if (textItems.length === 0) return [];

        const sorted = [...textItems].sort((a, b) => a.y - b.y || a.x - b.x);
        const paragraphs = [];
        let currentPara = { text: '', y: sorted[0].y, x: sorted[0].x, items: [] };
        // 保存当前行的 y 基准，用于区分同行的水平合并 vs 换行
        let lineBaseY = sorted[0].y;
        let lineBaseX = sorted[0].x;
        const lineHeightThreshold = sorted[0].fontSize * 0.6 || 6;

        for (const item of sorted) {
            const text = item.text.trim();
            if (!text) continue;

            const yDiff = Math.abs(item.y - currentPara.y);
            // 相对当前行的 y 偏移
            const yDiffFromLine = Math.abs(item.y - lineBaseY);

            if (yDiffFromLine < lineHeightThreshold * 1.2) {
                // 同一行：追加到当前行末，用空格分隔
                const needSpace = currentPara.text && item.x > lineBaseX;
                currentPara.text += (needSpace ? ' ' : '') + text;
                currentPara.items.push(item);
                // 更新行内最右侧位置
                lineBaseX = Math.max(lineBaseX, item.x + item.width);
            } else if (yDiff < item.fontSize * 3) {
                // 下一行但间距较小：换行加入同一段落
                currentPara.text += '\n' + text;
                currentPara.items.push(item);
                currentPara.y = item.y;
                currentPara.x = item.x;
                // 新行的基准
                lineBaseY = item.y;
                lineBaseX = item.x + item.width;
            } else {
                // 间距大：新段落
                paragraphs.push(currentPara);
                currentPara = { text, y: item.y, x: item.x, items: [item] };
                lineBaseY = item.y;
                lineBaseX = item.x + item.width;
            }
        }
        paragraphs.push(currentPara);

        return paragraphs.filter(p => p.text.trim());
    },

    /**
     * 匹配段落文本是否为章节标题
     */
    _matchSectionHeader(text) {
        const clean = text.trim();
        for (const [section, patterns] of Object.entries(this.SECTION_KEYWORDS)) {
            for (const pattern of patterns) {
                if (pattern.test(clean)) {
                    return section;
                }
            }
        }
        // 英文 section headers
        const enMap = {
            education: [/education/i, /academic/i],
            experience: [/experience/i, /employment/i, /work history/i, /career/i],
            skills: [/skills/i, /expertise/i, /technologies/i, /competencies/i],
            projects: [/projects/i, /portfolio/i],
            summary: [/summary/i, /profile/i, /objective/i],
        };
        for (const [section, patterns] of Object.entries(enMap)) {
            for (const pattern of patterns) {
                if (pattern.test(clean)) {
                    return section;
                }
            }
        }
        return null;
    },

    /**
     * 从章节段落中提取字段
     */
    _extractSectionFields(section, paragraphs, textItems) {
        switch (section) {
            case 'personal':
                return this._extractPersonalFromParas(paragraphs);
            case 'education':
                return this._extractEducationEntries(paragraphs);
            case 'experience':
                return this._extractExperienceEntries(paragraphs);
            case 'skills':
                return this._extractSkills(paragraphs, textItems);
            case 'projects':
                return this._extractProjectEntries(paragraphs);
            case 'summary':
                return { text: paragraphs.map(p => p.text).join('\n') };
            default:
                return { raw: paragraphs.map(p => p.text) };
        }
    },

    /**
     * 从段落中提取个人信息
     */
    _extractPersonalFromParas(paragraphs) {
        const text = paragraphs.map(p => p.text).join('\n');
        return this._extractPersonalFields(text, paragraphs);
    },

    /**
     * 从全文提取个人信息字段
     */
    _extractPersonalFields(fullText, _items) {
        const result = {};

        // 姓名：通常在第一行、字体最大
        const lines = fullText.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            // 第一行非空文本通常就是姓名（短文本，2-4个中文字符）
            const firstLine = lines[0].trim();
            if (firstLine.length >= 2 && firstLine.length <= 6 &&
                /^[\u4e00-\u9fa5·.]+$/.test(firstLine)) {
                result.name = firstLine;
            }
        }

        // 电话
        for (const pattern of this.FIELD_PATTERNS.phone) {
            const match = fullText.match(pattern);
            if (match) {
                const phone = match[1] || match[0];
                result.phone = phone.trim().replace(/[^0-9+\-()（）\s]/g, '').trim();
                break;
            }
        }

        // 邮箱
        const emailMatch = fullText.match(this.FIELD_PATTERNS.email[0]);
        if (emailMatch) {
            result.email = emailMatch[0].trim();
        }

        // 所在地
        for (const pattern of this.FIELD_PATTERNS.location) {
            const match = fullText.match(pattern);
            if (match && match[1]) {
                result.location = match[1].trim();
                break;
            }
        }

        // 求职意向（常见关键词）
        const titlePatterns = [
            /求职意向[：:]?\s*([^\s,，。\n]{2,20})/,
            /应聘[职位岗位][：:]?\s*([^\s,，。\n]{2,20})/,
            /目标职位[：:]?\s*([^\s,，。\n]{2,20})/,
            /意向[职位岗位][：:]?\s*([^\s,，。\n]{2,20})/,
        ];
        for (const pattern of titlePatterns) {
            const match = fullText.match(pattern);
            if (match && match[1]) {
                result.title = match[1].trim();
                break;
            }
        }

        return result;
    },

    /**
     * 提取教育经历条目列表
     */
    _extractEducationEntries(paragraphs) {
        const entries = [];
        // 教育经历通常每一条包含：学校、专业、学历、时间
        const eduRegex = /(.{2,20}?[大学学院学校])\s*[·\s]*([^·\s，。,\n]{2,20})?\s*[·\s]*([^·\s，。,\n]{2,10})?/;

        // 按时间标记分割条目
        const chunks = this._splitByDate(paragraphs);

        for (const chunk of chunks) {
            const text = chunk.text;
            const entry = { school: '', degree: '', major: '', startDate: '', endDate: '', description: '' };

            // 提取时间
            const dates = this._extractDates(text);
            if (dates.length > 0) {
                entry.startDate = dates[0].start;
                entry.endDate = dates[0].end;
            }

            // 提取学校（常见后缀）
            const schoolMatch = text.match(/([\u4e00-\u9fa5]{2,20}(?:大学|学院|学校|中学|研究院|研究所))/);
            if (schoolMatch) {
                entry.school = schoolMatch[1];
            }

            // 提取学历
            const degreeMatch = text.match(/(博士|硕士|本科|学士|专科|大专|研究生|MBA|EMBA)/);
            if (degreeMatch) {
                entry.degree = degreeMatch[1];
            }

            // 提取专业（在"专业："后面或学校名称后面的2-5字词）
            const majorMatch = text.match(/专业[：:]?\s*([\u4e00-\u9fa5]{2,20})/);
            if (majorMatch) {
                entry.major = majorMatch[1];
            } else if (entry.school && !entry.degree) {
                // 学校后面的词可能是专业
            }

            // 剩余文本作为描述
            const descParts = [];
            if (!entry.school && chunk.text.length > 0) {
                descParts.push(chunk.text);
            }
            entry.description = descParts.join('; ');

            // 至少要有学校或时间才认为是一个有效条目
            if (entry.school || dates.length > 0) {
                entries.push(entry);
            }
        }

        return entries.length > 0 ? entries : [{ school: '', degree: '', major: '', startDate: '', endDate: '', description: paragraphs.map(p => p.text).join('\n') }];
    },

    /**
     * 提取工作经历条目列表
     */
    _extractExperienceEntries(paragraphs) {
        const entries = [];
        const chunks = this._splitByDate(paragraphs);

        for (const chunk of chunks) {
            const text = chunk.text;
            const entry = { company: '', position: '', startDate: '', endDate: '', description: '' };

            // 提取时间
            const dates = this._extractDates(text);
            if (dates.length > 0) {
                entry.startDate = dates[0].start;
                entry.endDate = dates[0].end;
            }

            // 提取公司（常见公司后缀或"在/就职于/任职于"后面）
            const companyPatterns = [
                /(?:在|就职于|任职于|曾任职于|曾就职于)\s*([\u4e00-\u9fa5A-Za-z0-9（）()]{2,30})/,
                /([\u4e00-\u9fa5A-Za-z0-9（）()]{2,30}(?:科技|技术|有限公司|公司|集团|股份|有限|厂|局|院|所|银行|证券|保险))\s*/,
                /公司[：:]?\s*([\u4e00-\u9fa5A-Za-z0-9（）()]{2,30})/,
            ];
            for (const pattern of companyPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    entry.company = match[1].trim();
                    break;
                }
            }

            // 提取职位
            const posPatterns = [
                /(?:职位|岗位|担任|任职)[：:]?\s*([^\s,，。\n]{2,15})/,
                /([\u4e00-\u9fa5]{2,10}(?:工程师|经理|主管|总监|主任|专员|员|师|助理|负责人|设计师|架构师|开发))/,
            ];
            for (const pattern of posPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    entry.position = match[1].trim();
                    break;
                }
            }

            // 如果公司名很长，取前一部分
            if (entry.company.length > 20) {
                entry.company = entry.company.substring(0, 20);
            }

            // 剩余文本作为描述
            const descText = this._removeDateText(text);
            const cleanDesc = descText
                .replace(entry.company || '', '')
                .replace(entry.position || '', '')
                .replace(/公司[：:]\s*/, '')
                .replace(/职位[：:]\s*/, '')
                .trim();

            if (cleanDesc && cleanDesc.length > 2) {
                entry.description = cleanDesc;
            }

            if (entry.company || entry.position || dates.length > 0) {
                entries.push(entry);
            }
        }

        return entries.length > 0 ? entries : [{ company: '', position: '', startDate: '', endDate: '', description: paragraphs.map(p => p.text).join('\n') }];
    },

    /**
     * 提取技能列表
     */
    _extractSkills(paragraphs, _textItems) {
        const skills = [];

        // 逐个处理段落，按换行符保留原始逐行结构
        for (const para of paragraphs) {
            const text = para.text.trim();
            if (!text) continue;

            // 按换行符拆分，保留原始行顺序
            const lines = text.split('\n').filter(l => l.trim());
            for (const line of lines) {
                const clean = line.trim().replace(/^[•·\-*\s\d.、，]+/, '');
                if (clean.length < 1) continue;
                // 过滤日期和纯标识符
                if (/^\d{4}[-年]/.test(clean)) continue;
                if (/^[0-9+\-—~.@#]+$/.test(clean)) continue;
                // 去重
                if (!skills.some(s => s.name === clean)) {
                    skills.push({ name: clean });
                }
            }
        }

        return skills.length > 0 ? skills : [{ name: '' }];
    },

    /**
     * 提取项目经历条目列表
     */
    _extractProjectEntries(paragraphs) {
        const entries = [];
        const chunks = this._splitByDate(paragraphs);

        for (const chunk of chunks) {
            const text = chunk.text;
            const entry = { name: '', role: '', startDate: '', endDate: '', description: '', link: '' };

            // 提取时间
            const dates = this._extractDates(text);
            if (dates.length > 0) {
                entry.startDate = dates[0].start;
                entry.endDate = dates[0].end;
            }

            // 提取角色
            const rolePatterns = [
                /(?:角色|职责|担任)[：:]?\s*([^\s,，。\n]{2,15})/,
                /([\u4e00-\u9fa5]{2,10}(?:负责人|开发|设计|架构|研发|产品|测试))/,
            ];
            for (const pattern of rolePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    entry.role = match[1].trim();
                    break;
                }
            }

            // 提取链接
            const linkMatch = text.match(/https?:\/\/[^\s,，。\n]+/);
            if (linkMatch) {
                entry.link = linkMatch[0].trim();
            }

            // 第一行通常是项目名称
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length > 0 && !dates.some(d => d.text === lines[0])) {
                const firstLine = lines[0].trim();
                if (firstLine.length >= 2 && firstLine.length <= 30) {
                    entry.name = firstLine;
                }
            }

            // 剩余文本
            const descText = this._removeDateText(text)
                .replace(entry.name || '', '')
                .replace(entry.role || '', '')
                .replace(/https?:\/\/[^\s,，。\n]+/, '')
                .trim();
            if (descText && descText.length > 2) {
                entry.description = descText;
            }

            if (entry.name || dates.length > 0) {
                entries.push(entry);
            }
        }

        return entries.length > 0 ? entries : [{ name: '', role: '', startDate: '', endDate: '', description: paragraphs.map(p => p.text).join('\n'), link: '' }];
    },

    /**
     * 按日期边界拆分段落
     */
    _splitByDate(paragraphs) {
        const chunks = [];
        let currentChunk = { text: '', paras: [] };

        for (const para of paragraphs) {
            const hasDate = this._hasDate(para.text);
            if (hasDate && currentChunk.paras.length > 0) {
                chunks.push(currentChunk);
                currentChunk = { text: '', paras: [] };
            }
            currentChunk.paras.push(para);
            currentChunk.text += (currentChunk.text ? '\n' : '') + para.text;
        }

        if (currentChunk.paras.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    },

    /**
     * 检查文本是否包含日期
     */
    _hasDate(text) {
        return /(\d{4})\s*[年/\-—~.]\s*\d{0,2}\s*[月/\-]?/.test(text) ||
               /(\d{4})\s*[年/\-—~.]\s*(\d{1,2})?\s*月?/.test(text);
    },

    /**
     * 从文本提取日期对（开始-结束）
     */
    _extractDates(text) {
        const results = [];
        // 匹配 "YYYY-MM — YYYY-MM" 或 "YYYY年MM月 — YYYY年MM月" 或 "至今"
        const dateRangePatterns = [
            // Pattern 0: 2020.03 — 2023.01（完整年月）
            {
                regex: /(\d{4})[.\-年/](\d{1,2})?[月.\-/]?\s*[–—\-~to]+?\s*(\d{4})[.\-年/](\d{1,2})?[月.\-/]?/g,
                extract: (m) => {
                    const start = m[2] ? `${m[1]}-${m[2].padStart(2, '0')}` : m[1];
                    const end = m[4] ? `${m[3]}-${m[4].padStart(2, '0')}` : m[3];
                    return { start, end };
                }
            },
            // Pattern 1: 2020.03 — 至今
            {
                regex: /(\d{4})[.\-年/](\d{1,2})?[月.\-/]?\s*[–—\-~to]+?\s*(至今|现在|当前|Present)/gi,
                extract: (m) => {
                    const start = m[2] ? `${m[1]}-${m[2].padStart(2, '0')}` : m[1];
                    return { start, end: '至今' };
                }
            },
            // Pattern 2: 2020 — 2023（仅年份）
            {
                regex: /(\d{4})\s*[–—\-~to]+\s*(\d{4})/g,
                extract: (m) => ({ start: m[1], end: m[2] })
            },
            // Pattern 3: 2020.03 — 2023（起始有月，结束仅年）
            {
                regex: /(\d{4})[.\-年/](\d{1,2})?[月.\-/]?\s*[–—\-~to]+\s*(\d{4})/g,
                extract: (m) => {
                    const start = m[2] ? `${m[1]}-${m[2].padStart(2, '0')}` : m[1];
                    return { start, end: m[3] };
                }
            },
        ];

        for (const { regex, extract } of dateRangePatterns) {
            regex.lastIndex = 0;
            const m = regex.exec(text);
            if (m) {
                const { start, end } = extract(m);
                results.push({ start, end, text: m[0] });
                break;
            }
        }

        if (results.length === 0) {
            // 尝试匹配单个日期
            const singlePattern = /(\d{4})[.\-年/](\d{1,2})?[月.\-/]?/;
            const match = text.match(singlePattern);
            if (match) {
                const date = match[2] ? `${match[1]}-${match[2].padStart(2, '0')}` : `${match[1]}`;
                results.push({ start: date, end: '', text: match[0] });
            }
        }

        return results;
    },

    /**
     * 从文本中去掉日期部分
     */
    _removeDateText(text) {
        // 用单个更精确的正则替换多个 replace，加 \b 避免误伤无关数字
        return text
            .replace(/\b\d{4}[.\-年/]\d{1,2}[月.\-/]?\s*[–—\-~to]+\s*\d{4}[.\-年/]?\d{0,2}[月.\-/]?\b/g, '')
            .replace(/\b\d{4}[.\-年/]\d{1,2}[月.\-/]?\s*[–—\-~to]+\s*(至今|现在|当前|Present)\b/gi, '')
            .replace(/\b\d{4}\s*[–—\-~to]+\s*\d{4}\b/g, '')
            .replace(/\b\d{4}[.\-年/]\d{1,2}[月.\-/]?\b/g, '')
            .replace(/\b\d{4}\b(?!\s*[.\-年/])/g, '') // 单独的年份（不跟日期分隔符）
            .replace(/\s{2,}/g, ' ')
            .trim();
    },

    /**
     * 将解析结果映射到系统标准数据结构
     */
    _mapToResumeData(parsed) {
        const data = {
            personal: { name: '', title: '', phone: '', email: '', location: '', summary: '', avatar: '' },
            education: [],
            experience: [],
            skills: [],
            projects: [],
        };

        // 个人信息
        if (parsed.sections.personal) {
            Object.assign(data.personal, parsed.sections.personal);
        }

        // 个人简介
        if (parsed.sections.summary) {
            const summaryText = parsed.sections.summary.text || parsed.sections.summary;
            if (typeof summaryText === 'string') {
                data.personal.summary = summaryText;
            }
        }

        // 从全文找个人简介（如果 summary section 不存在，在个人信息后找段落）
        if (!data.personal.summary && parsed.paragraphs) {
            const personalEndIdx = parsed.paragraphs.findIndex(p =>
                this._matchSectionHeader(p)
            );
            if (personalEndIdx > 0) {
                // 取个人信息段落之后的文本
                const afterPersonal = parsed.paragraphs.slice(1, Math.min(3, personalEndIdx));
                const summaryText = afterPersonal.join('\n');
                if (summaryText.length > 10 && summaryText.length < 200) {
                    data.personal.summary = summaryText;
                }
            }
        }

        // 教育经历
        if (parsed.sections.education) {
            data.education = Array.isArray(parsed.sections.education)
                ? parsed.sections.education : [parsed.sections.education];
        }

        // 工作经历
        if (parsed.sections.experience) {
            data.experience = Array.isArray(parsed.sections.experience)
                ? parsed.sections.experience : [parsed.sections.experience];
        }

        // 技能
        if (parsed.sections.skills) {
            data.skills = Array.isArray(parsed.sections.skills)
                ? parsed.sections.skills : [parsed.sections.skills];
        }

        // 项目
        if (parsed.sections.projects) {
            data.projects = Array.isArray(parsed.sections.projects)
                ? parsed.sections.projects : [parsed.sections.projects];
        }

        return data;
    },

    /**
     * 根据深度风格指纹生成高度适配的 CSS 模板
     */
    _generateTemplate(parsed, layoutInfo, fileName) {
        this._importCount++;
        const id = `imported-${Date.now()}`;
        const name = `📄 ${Array.from(fileName.replace(/\.pdf$/i, '')).slice(0, 24).join('')}`;

        // ── 从指纹中解构风格参数 ──
        const L = layoutInfo;
        const C = L.colors;
        const bodySize = L.bodyFontSize || 12;
        const headerSize = L.headerFontSize || bodySize * 1.4;
        const nameSize = Math.max(18, L.nameFontSize || bodySize * 2);
        const pad = L.padding || 36;
        const isTwoCol = L.isTwoColumn;
        const isCompact = L.isCompact;
        const isTight = L.isTight;
        const isLoose = L.isLoose;
        const hasCenter = L.alignment === 'center';
        const hasInlineContact = L.hasInlineContact;
        const hasUppercase = L.hasUppercaseHeaders;
        const hasLines = L.hasSectionLines;
        const hasHeaderBlock = L.hasHeaderBlock;
        const styleType = L.styleType || 'professional';
        const fontFamily = L.fontFamily || "'Helvetica Neue', Arial, sans-serif";
        const isSerif = L.isSerif;

        // 间距因子
        const s = isCompact ? 0.85 : isTight ? 0.9 : 1;
        const sectionGap = Math.round(18 * s);
        const itemGap = Math.round(12 * s);

        // 标题装饰风格
        const sectionBorderStyle = hasLines ? 'solid' : (hasUppercase ? 'none' : 'solid');
        const sectionBorderWidth = hasLines ? '1px' : '2px';
        const sectionTransform = hasUppercase ? 'uppercase' : 'none';
        const sectionLetterSpacing = hasUppercase ? '1.5px' : '0';

        // ── 根据风格类型生成 CSS ──
        // 每种风格类型有不同的布局策略
        let bodyCss = '';
        let headerCss = '';
        let sectionCss = '';
        let itemCss = '';
        let skillCss = '';
        let avatarCss = '';
        let contactCss = '';

        // ========= 全局容器 =========
        const containerCss = `
            .imported-resume {
                font-family: ${fontFamily};
                color: ${C.text};
                line-height: ${isTight ? '1.4' : isLoose ? '1.8' : '1.6'};
                padding: ${pad}px ${Math.min(pad + 8, 48)}px;
                font-size: ${bodySize}px;
                ${isCompact ? 'word-spacing: -0.3px;' : ''}
            }`;

        // ========= 头部 =========
        if (hasHeaderBlock && hasCenter) {
            // 居中大标题风格
            headerCss = `
            .imported-header {
                text-align: center;
                margin-bottom: ${Math.round(22 * s)}px;
                padding-bottom: ${Math.round(14 * s)}px;
                ${hasLines ? `border-bottom: 2px solid ${C.border};` :
                  `background: linear-gradient(135deg, ${C.header}, ${C.accent});
                   margin: -${pad}px -${Math.min(pad + 8, 48)}px ${Math.round(22 * s)}px;
                   padding: ${Math.round(32 * s)}px ${Math.min(pad + 8, 48)}px ${Math.round(20 * s)}px;
                   color: #fff;`}
            }
            .imported-name {
                font-size: ${nameSize}px;
                font-weight: 700;
                color: ${hasLines ? C.header : '#fff'};
                margin-bottom: 4px;
                ${isSerif ? 'font-weight: 600;' : ''}
            }
            .imported-title {
                font-size: ${Math.max(13, bodySize * 1.15)}px;
                color: ${hasLines ? C.accent : 'rgba(255,255,255,0.85)'};
                margin-bottom: 8px;
                font-weight: 500;
            }
            .imported-contact {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                font-size: ${Math.max(10, bodySize * 0.85)}px;
                color: ${hasLines ? C.muted : 'rgba(255,255,255,0.75)'};
            }
            .imported-contact span { display: inline-flex; align-items: center; gap: 4px; }`;
        } else {
            // 传统左对齐
            headerCss = `
            .imported-header {
                margin-bottom: ${Math.round(20 * s)}px;
                padding-bottom: ${Math.round(12 * s)}px;
                border-bottom: 2px solid ${C.border};
            }
            .imported-name {
                font-size: ${nameSize}px;
                font-weight: 700;
                color: ${C.header};
                margin-bottom: 2px;
                ${isSerif ? `font-weight: 600; letter-spacing: 0.5px;` : ''}
            }
            .imported-title {
                font-size: ${Math.max(13, bodySize * 1.15)}px;
                color: ${C.accent};
                margin-bottom: ${hasInlineContact ? '4px' : '8px'};
                font-weight: 500;
            }
            .imported-contact {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                font-size: ${Math.max(10, bodySize * 0.85)}px;
                color: ${C.muted};
            }
            .imported-contact span { display: inline-flex; align-items: center; gap: 4px; }`;
        }

        // ========= 头像样式 =========
        // 居中头部用白色边框头像，左对齐头部用主题色边框
        if (hasHeaderBlock && hasCenter) {
            avatarCss = `
            .imported-avatar {
                text-align: center;
                margin-bottom: 14px;
            }
            .imported-avatar img {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid rgba(255,255,255,0.5);
            }`;
        } else {
            avatarCss = `
            .imported-avatar {
                float: left;
                margin-right: 18px;
                margin-bottom: 10px;
            }
            .imported-avatar img {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid ${C.accentLight};
            }
            .imported-header::after {
                content: '';
                display: table;
                clear: both;
            }`;
        }

        // ========= 章节标题 =========
        if (hasUppercase && !hasLines) {
            // 仅大写+间距，无下划线（如经典现代风格）
            sectionCss = `
            .imported-section {
                margin-bottom: ${sectionGap}px;
            }
            .imported-section-title {
                font-size: ${Math.max(12, bodySize * 1.15)}px;
                font-weight: 700;
                color: ${C.header};
                padding-bottom: 4px;
                margin-bottom: ${Math.round(10 * s)}px;
                text-transform: uppercase;
                letter-spacing: ${sectionLetterSpacing};
                border-bottom: none;
                ${isSerif ? `font-weight: 600;` : ''}
            }`;
        } else if (hasLines) {
            // 有分隔线的章节标题
            sectionCss = `
            .imported-section {
                margin-bottom: ${sectionGap}px;
            }
            .imported-section-title {
                font-size: ${Math.max(13, bodySize * 1.2)}px;
                font-weight: 700;
                color: ${C.header};
                padding-bottom: 6px;
                margin-bottom: ${Math.round(10 * s)}px;
                border-bottom: ${sectionBorderWidth} ${sectionBorderStyle} ${C.accent};
                ${hasUppercase ? `text-transform: uppercase; letter-spacing: ${sectionLetterSpacing};` : ''}
                ${isSerif ? `font-weight: 600;` : ''}
            }`;
        } else {
            // 标准下划线风格
            sectionCss = `
            .imported-section {
                margin-bottom: ${sectionGap}px;
            }
            .imported-section-title {
                font-size: ${Math.max(13, bodySize * 1.2)}px;
                font-weight: 700;
                color: ${C.header};
                padding-bottom: 5px;
                margin-bottom: ${Math.round(10 * s)}px;
                border-bottom: ${sectionBorderWidth} ${sectionBorderStyle} ${C.border};
                ${hasUppercase ? `text-transform: uppercase; letter-spacing: ${sectionLetterSpacing};` : ''}
                ${isSerif ? `font-weight: 600;` : ''}
            }`;
        }

        // ========= 条目布局 =========
        if (isCompact) {
            itemCss = `
            .imported-item {
                margin-bottom: ${itemGap}px;
            }
            .imported-item-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                flex-wrap: wrap;
                gap: 2px;
                margin-bottom: 1px;
            }
            .imported-item-title {
                font-size: ${Math.max(12, bodySize * 1.05)}px;
                font-weight: 600;
                color: ${C.header};
            }
            .imported-item-sub {
                font-size: ${Math.max(11, bodySize * 0.9)}px;
                color: ${C.accent};
                margin-left: 4px;
            }
            .imported-date {
                font-size: ${Math.max(10, bodySize * 0.8)}px;
                color: ${C.muted};
                white-space: nowrap;
            }
            .imported-desc {
                font-size: ${Math.max(11, bodySize * 0.9)}px;
                color: ${C.text};
                white-space: pre-wrap;
                line-height: ${isTight ? '1.35' : '1.5'};
            }`;
        } else {
            itemCss = `
            .imported-item {
                margin-bottom: ${itemGap}px;
            }
            .imported-item-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                flex-wrap: wrap;
                gap: 4px;
                margin-bottom: 3px;
            }
            .imported-item-title {
                font-size: ${Math.max(13, bodySize * 1.08)}px;
                font-weight: 600;
                color: ${C.header};
            }
            .imported-item-sub {
                font-size: ${Math.max(12, bodySize * 0.95)}px;
                color: ${C.accent};
                margin-left: 4px;
            }
            .imported-date {
                font-size: ${Math.max(11, bodySize * 0.85)}px;
                color: ${C.muted};
                white-space: nowrap;
            }
            .imported-desc {
                font-size: ${Math.max(12, bodySize * 0.95)}px;
                color: ${C.text};
                white-space: pre-wrap;
                line-height: ${isTight ? '1.4' : '1.6'};
            }`;
        }

        // ========= 技能标签 =========
        if (isCompact) {
            skillCss = `
            .imported-skills {
                display: flex;
                flex-wrap: wrap;
                gap: 3px 10px;
            }
            .imported-skill {
                font-size: ${Math.max(11, bodySize * 0.9)}px;
                font-weight: 500;
                color: ${C.header};
                ${styleType === 'sidebar' ? 'background: ' + C.accentLight + '; padding: 2px 8px; border-radius: 3px;' : ''}
            }`;
        } else {
            skillCss = `
            .imported-skills {
                display: flex;
                flex-wrap: wrap;
                gap: 5px 14px;
            }
            .imported-skill {
                font-size: ${Math.max(12, bodySize)}px;
                font-weight: 500;
                color: ${C.text};
                ${styleType === 'sidebar' ? 'background: ' + C.accentLight + '; padding: 3px 10px; border-radius: 4px;' : ''}
            }`;
        }

        // ========= 双栏布局 =========
        if (isTwoCol) {
            bodyCss = `
            .imported-body {
                display: flex;
                gap: ${Math.round(24 * s)}px;
            }
            .imported-main {
                flex: ${L.leftRatio > 0.5 ? '1.6' : '1.3'};
            }
            .imported-sidebar {
                flex: 1;
                background: ${C.accentLight};
                padding: ${Math.round(16 * s)}px;
                border-radius: 6px;
            }
            .imported-summary {
                font-size: ${Math.max(12, bodySize)}px;
                color: ${C.text};
                line-height: 1.7;
                white-space: pre-wrap;
            }`;
        } else {
            bodyCss = `
            .imported-body { }
            .imported-summary {
                font-size: ${Math.max(12, bodySize)}px;
                color: ${C.text};
                line-height: 1.7;
                white-space: pre-wrap;
            }`;
        }

        // ========= 组装最终 CSS =========
        const css = `
            /* ===== 风格适配模板: ${name} (${styleType}) ===== */
            ${containerCss}
            ${headerCss}
            ${avatarCss}
            ${bodyCss}
            ${sectionCss}
            ${itemCss}
            ${skillCss}
        `;

        // ── 生成渲染函数（escapeHtml 防止 XSS） ──
        const esc = (s) => this._escapeHtml(s);
        const renderer = (data) => {
            const d = data || {};
            const personal = d.personal || {};
            const education = d.education || [];
            const experience = d.experience || [];
            const skills = d.skills || [];
            const projects = d.projects || [];
            const customSections = d.customSections || [];

            const contactParts = [];
            if (personal.phone) contactParts.push(`\uD83D\uDCDE ${esc(personal.phone)}`);
            if (personal.email) contactParts.push(`\u2709\uFE0F ${esc(personal.email)}`);
            if (personal.location) contactParts.push(`\uD83D\uDCCD ${esc(personal.location)}`);

            const mainContent = `
                ${experience.length > 0 ? `
                <div class="imported-section">
                    <h2 class="imported-section-title">\uD83D\uDCBC 工作经历</h2>
                    ${experience.map(exp => `
                    <div class="imported-item">
                        <div class="imported-item-header">
                            <div>
                                <span class="imported-item-title">${esc(exp.position)}</span>
                                ${exp.company ? `<span class="imported-item-sub">@ ${esc(exp.company)}</span>` : ''}
                            </div>
                            <span class="imported-date">${esc(exp.startDate)} — ${esc(exp.endDate || '至今')}</span>
                        </div>
                        ${exp.description ? `<p class="imported-desc">${esc(exp.description)}</p>` : ''}
                    </div>
                    `).join('')}
                </div>` : ''}

                ${education.length > 0 ? `
                <div class="imported-section">
                    <h2 class="imported-section-title">\uD83C\uDF93 教育经历</h2>
                    ${education.map(edu => `
                    <div class="imported-item">
                        <div class="imported-item-header">
                            <div>
                                <span class="imported-item-title">${esc(edu.school)}</span>
                                <span class="imported-item-sub">${esc(edu.major)}${edu.degree ? ' · ' + esc(edu.degree) : ''}</span>
                            </div>
                            <span class="imported-date">${esc(edu.startDate)} — ${esc(edu.endDate || '至今')}</span>
                        </div>
                        ${edu.description ? `<p class="imported-desc">${esc(edu.description)}</p>` : ''}
                    </div>
                    `).join('')}
                </div>` : ''}

                ${projects.length > 0 ? `
                <div class="imported-section">
                    <h2 class="imported-section-title">\uD83D\uDE80 项目经历</h2>
                    ${projects.map(proj => `
                    <div class="imported-item">
                        <div class="imported-item-header">
                            <div>
                                <span class="imported-item-title">${esc(proj.name)}</span>
                                ${proj.role ? `<span class="imported-item-sub">(${esc(proj.role)})</span>` : ''}
                            </div>
                            <span class="imported-date">${esc(proj.startDate)} — ${esc(proj.endDate || '至今')}</span>
                        </div>
                        ${proj.description ? `<p class="imported-desc">${esc(proj.description)}</p>` : ''}
                        ${proj.link ? `<p class="imported-desc" style="margin-top:4px;">\uD83D\uDD17 <a href="${esc(proj.link)}" target="_blank">${esc(proj.link)}</a></p>` : ''}
                    </div>
                    `).join('')}
                </div>` : ''}

                ${skills.length > 0 ? `
                <div class="imported-section">
                    <h2 class="imported-section-title">\uD83D\uDD27 专业技能</h2>
                    <div class="imported-skills">
                        ${skills.map(s => `<span class="imported-skill">${esc(s.name)}</span>`).join('')}
                    </div>
                </div>` : ''}

                ${Templates.renderCustomSections(customSections, 'imported-', L.colors)}
            `;

            const sidebarContent = `
                ${personal.summary ? `
                <div class="imported-section">
                    <h2 class="imported-section-title">\uD83D\uDCCC 个人简介</h2>
                    <p class="imported-summary">${esc(personal.summary)}</p>
                </div>` : ''}
            `;

            return `
                <div class="imported-resume">
                    <div class="imported-header">
                        ${personal.avatar ? `<div class="imported-avatar"><img src="${esc(personal.avatar)}" alt="头像"></div>` : ''}
                        <h1 class="imported-name">${esc(personal.name) || '你的姓名'}</h1>
                        <div class="imported-title">${esc(personal.title) || '求职意向'}</div>
                        ${contactParts.length > 0 ? `
                        <div class="imported-contact">
                            ${contactParts.join('')}
                        </div>` : ''}
                    </div>
                    ${isTwoCol ? `
                    <div class="imported-body">
                        <div class="imported-main">${mainContent}</div>
                        <div class="imported-sidebar">${sidebarContent}</div>
                    </div>` : `
                    <div class="imported-body">
                        ${sidebarContent}
                        ${mainContent}
                    </div>`}
                </div>
            `;
        };

        // 注册模板
        Templates.register(id, name, renderer, css);

        return id;
    },
};
