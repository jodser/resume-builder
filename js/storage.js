/**
 * storage.js - 本地数据持久化模块
 * 使用 localStorage 存储和恢复简历数据
 */

const Storage = {
    KEY: 'resume-builder-data',
    SAVE_DEBOUNCE: 500,

    /**
     * 保存数据到 localStorage
     * @param {Object} data - 完整的简历数据
     */
    save(data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(this.KEY, serialized);
            return true;
        } catch (e) {
            console.error('保存失败:', e);
            return false;
        }
    },

    /**
     * 从 localStorage 读取数据
     * @returns {Object|null} 简历数据，不存在返回 null
     */
    load() {
        try {
            const serialized = localStorage.getItem(this.KEY);
            if (serialized === null) return null;
            return JSON.parse(serialized);
        } catch (e) {
            console.error('读取失败:', e);
            return null;
        }
    },

    /**
     * 清除保存的数据
     */
    clear() {
        localStorage.removeItem(this.KEY);
    },

    /**
     * 检查是否有保存的数据
     */
    hasData() {
        return localStorage.getItem(this.KEY) !== null;
    },

    /**
     * 导出数据为 JSON 字符串
     */
    exportJSON(data) {
        return JSON.stringify(data, null, 2);
    },

    /**
     * 从 JSON 字符串导入数据
     */
    importJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            // 基本验证
            if (!data || typeof data !== 'object') return null;
            return data;
        } catch (e) {
            console.error('导入失败:', e);
            return null;
        }
    }
};
