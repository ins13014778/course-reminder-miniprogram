// 简单日期格式化
function formatDate(fmt) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  if (fmt === 'YYYY-MM-DD HH:mm:ss') {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// OCR API配置
const OCR_CONFIG = {
  baseUrl: 'https://api.scnet.cn/api/llm/v1',
  recognizeEndpoint: '/ocr/recognize',
  maxFileSize: 10 * 1024 * 1024,
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  defaultApiKey: 'sk-NjEwLTExMTk0NDQzMzA3LTE3NzMzMTM3MjA5NTM=',
};

const WEEKDAY_NAMES = ['', '一', '二', '三', '四', '五', '六', '日'];

/**
 * 基于OCR文本元素的空间位置，重建课程表表格结构
 * 将散乱的OCR文本按 (星期列, 节次行) 分组到对应单元格
 * 输出格式: [星期X 第N-M节] 单元格内容（每行一个文本元素）
 */
function extractStructuredOcrText(ocrData) {
  if (!ocrData || !Array.isArray(ocrData)) return { structured: '', plain: '' };

  var elements = [];
  var plainText = '';

  // 1. 收集所有带位置的文本元素
  ocrData.forEach(function(item) {
    if (item.result && Array.isArray(item.result)) {
      item.result.forEach(function(r) {
        if (r.elements && r.elements.text && Array.isArray(r.elements.text)) {
          r.elements.text.forEach(function(t) {
            plainText += t.text + '\n';
            elements.push({
              text: t.text || '',
              x: t.x != null ? t.x : (t.pos ? t.pos[0][0] : 0),
              y: t.y != null ? t.y : (t.pos ? t.pos[0][1] : 0),
              width: t.width || 0,
              height: t.height || 0,
            });
          });
        }
      });
    }
  });

  if (elements.length === 0) return { structured: '', plain: '' };

  // 2. 检测星期标题元素
  var WD_KEYS = { '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4,
    '星期五': 5, '星期六': 6, '星期日': 7, '星期天': 7,
    '周一': 1, '周二': 2, '周三': 3, '周四': 4,
    '周五': 5, '周六': 6, '周日': 7, '周天': 7 };
  var WD_NAMES = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };

  var weekdayHeaders = [];
  elements.forEach(function(el) {
    var keys = Object.keys(WD_KEYS);
    for (var k = 0; k < keys.length; k++) {
      if (el.text.trim() === keys[k] || el.text.indexOf(keys[k]) >= 0) {
        weekdayHeaders.push({ weekday: WD_KEYS[keys[k]], x: el.x, width: el.width, y: el.y, h: el.height });
        break;
      }
    }
  });

  // 按x坐标排序、按weekday去重
  weekdayHeaders.sort(function(a, b) { return a.x - b.x; });
  var seen = {};
  var uniqueHeaders = [];
  weekdayHeaders.forEach(function(h) {
    if (!seen[h.weekday]) { seen[h.weekday] = true; uniqueHeaders.push(h); }
  });

  // 少于3个星期列则无法重建表格，回退纯文本
  if (uniqueHeaders.length < 3) {
    return { structured: '', plain: plainText };
  }

  // 3. 计算列边界（使用相邻标题x坐标的中点作为分界）
  var columns = [];
  for (var i = 0; i < uniqueHeaders.length; i++) {
    var h = uniqueHeaders[i];
    var prev = i > 0 ? uniqueHeaders[i - 1] : null;
    var next = i < uniqueHeaders.length - 1 ? uniqueHeaders[i + 1] : null;
    var left = prev ? Math.floor((prev.x + h.x) / 2) : 0;
    var right = next ? Math.floor((h.x + next.x) / 2) : h.x + 300;
    columns.push({ weekday: h.weekday, left: left, right: right });
  }

  // 4. 表头底部y（标题行下方的内容区起点）
  var headerBottomY = 0;
  uniqueHeaders.forEach(function(h) {
    var bot = h.y + h.h;
    if (bot > headerBottomY) headerBottomY = bot;
  });
  headerBottomY += 5;

  // 5. 检测节次数字（左侧列的单个数字: 1,2,3,...）
  var firstColLeft = columns[0].left;
  var sectionEls = elements.filter(function(el) {
    return /^\d{1,2}$/.test(el.text.trim()) && el.x < firstColLeft && el.y > headerBottomY;
  }).sort(function(a, b) { return a.y - b.y; });

  // 6. 按节次对（1-2, 3-4, 5-6, ...）建立行边界
  var rowGroups = [];
  for (var s = 0; s < sectionEls.length; s += 2) {
    var startSec = parseInt(sectionEls[s].text);
    var endSec = s + 1 < sectionEls.length ? parseInt(sectionEls[s + 1].text) : startSec + 1;
    var topY = sectionEls[s].y - 10;
    var bottomY = s + 2 < sectionEls.length ? sectionEls[s + 2].y - 10 : sectionEls[s].y + 300;
    rowGroups.push({ startSection: startSec, endSection: endSec, top: topY, bottom: bottomY });
  }

  if (rowGroups.length === 0) {
    return { structured: '', plain: plainText };
  }

  // 7. 将每个内容元素分配到 (星期, 节次) 单元格
  var cells = {};
  elements.forEach(function(el) {
    if (el.y <= headerBottomY) return;  // 跳过表头
    if (el.x < firstColLeft) return;    // 跳过左侧列

    // 找所属星期列
    var weekday = 0;
    for (var c = 0; c < columns.length; c++) {
      if (el.x >= columns[c].left - 15 && el.x < columns[c].right + 15) {
        weekday = columns[c].weekday;
        break;
      }
    }
    if (weekday === 0) return;

    // 找所属行组
    var rowKey = 0;
    for (var r = 0; r < rowGroups.length; r++) {
      if (el.y >= rowGroups[r].top && el.y < rowGroups[r].bottom) {
        rowKey = rowGroups[r].startSection;
        break;
      }
    }
    if (rowKey === 0) return;

    var key = weekday + '-' + rowKey;
    if (!cells[key]) {
      var rg = rowGroups.find(function(g) { return g.startSection === rowKey; });
      cells[key] = {
        weekday: weekday,
        startSection: rowKey,
        endSection: rg ? rg.endSection : rowKey + 1,
        texts: []
      };
    }
    cells[key].texts.push({ text: el.text, y: el.y, x: el.x });
  });

  // 8. 格式化输出：每个单元格标注 [星期X 第N-M节]
  var cellKeys = Object.keys(cells);
  var cellEntries = cellKeys.map(function(k) { return cells[k]; })
    .filter(function(c) { return c.texts.length > 0; })
    .sort(function(a, b) {
      return a.weekday !== b.weekday ? a.weekday - b.weekday : a.startSection - b.startSection;
    });

  // 提取表头信息行（学期、班级、专业等）
  var headerTexts = elements
    .filter(function(el) { return el.y <= headerBottomY; })
    .filter(function(el) {
      var t = el.text.trim();
      // 排除纯星期标题和"时间段""节次"等
      return t.length > 3 && !/^星期|^周[一二三四五六日]$|^时间段?$|^节次$/.test(t);
    })
    .sort(function(a, b) { return a.x - b.x; })
    .map(function(el) { return el.text; });

  var structured = '';
  if (headerTexts.length > 0) {
    structured += '[表头] ' + headerTexts.join(' | ') + '\n\n';
  }

  cellEntries.forEach(function(cell) {
    cell.texts.sort(function(a, b) { return a.y - b.y; });
    var lines = cell.texts.map(function(t) { return t.text; });
    structured += '[星期' + WD_NAMES[cell.weekday] + ' 第' + cell.startSection + '-' + cell.endSection + '节]\n';
    structured += lines.join('\n') + '\n\n';
  });

  return { structured: structured.trim(), plain: plainText };
}

function normalizeOcrValue(value) {
  return String(value || '')
    .replace(/[（【]/g, '(')
    .replace(/[）】]/g, ')')
    .replace(/[：]/g, ':')
    .replace(/\s+/g, '')
    .trim();
}

function collectOcrTextElements(ocrData) {
  const elements = [];
  if (!Array.isArray(ocrData)) return elements;

  ocrData.forEach((item) => {
    if (!item || !Array.isArray(item.result)) return;
    item.result.forEach((resultItem) => {
      const texts = resultItem && resultItem.elements && resultItem.elements.text;
      if (!Array.isArray(texts)) return;
      texts.forEach((textItem) => {
        elements.push({
          text: normalizeOcrValue(textItem.text),
          x: textItem.x != null ? textItem.x : (textItem.pos ? textItem.pos[0][0] : 0),
          y: textItem.y != null ? textItem.y : (textItem.pos ? textItem.pos[0][1] : 0),
          width: textItem.width || 0,
          height: textItem.height || 0
        });
      });
    });
  });

  return elements.sort((a, b) => a.y - b.y || a.x - b.x);
}

function parseScheduleFromOcrGrid(ocrData) {
  const elements = collectOcrTextElements(ocrData);
  if (!elements.length) return [];

  const weekdayMap = {
    '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7, '星期天': 7,
    '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7, '周天': 7
  };

  const weekdayHeaders = [];
  elements.forEach((el) => {
    Object.keys(weekdayMap).forEach((name) => {
      if (el.text === name || el.text.indexOf(name) >= 0) {
        weekdayHeaders.push({ weekday: weekdayMap[name], x: el.x, y: el.y, height: el.height });
      }
    });
  });

  weekdayHeaders.sort((a, b) => a.x - b.x);
  const headers = [];
  weekdayHeaders.forEach((header) => {
    const duplicated = headers.find((item) => item.weekday === header.weekday || Math.abs(item.x - header.x) < 20);
    if (!duplicated) headers.push(header);
  });
  if (headers.length < 5) return [];

  const headerBottomY = Math.max.apply(null, headers.map((item) => item.y + (item.height || 0))) + 5;
  const sectionMarkers = [];
  for (let section = 1; section <= 10; section++) {
    const marker = elements.find((el) =>
      el.text === String(section) &&
      el.x < headers[0].x &&
      el.y > headerBottomY &&
      el.width <= 40
    );
    if (marker) {
      sectionMarkers.push({ section, y: marker.y });
    }
  }
  sectionMarkers.sort((a, b) => a.y - b.y);
  if (sectionMarkers.length < 2) return [];

  const columns = headers.map((header, index) => {
    const prev = headers[index - 1];
    const next = headers[index + 1];
    return {
      weekday: header.weekday,
      left: prev ? Math.floor((prev.x + header.x) / 2) : 0,
      right: next ? Math.floor((header.x + next.x) / 2) : 9999
    };
  });

  const rows = [];
  for (let i = 0; i < sectionMarkers.length; i += 2) {
    const current = sectionMarkers[i];
    const nextGroup = sectionMarkers[i + 2];
    rows.push({
      startSection: current.section,
      endSection: sectionMarkers[i + 1] ? sectionMarkers[i + 1].section : current.section,
      top: current.y - 20,
      bottom: nextGroup ? nextGroup.y - 20 : 9999
    });
  }

  const cells = {};
  rows.forEach((row) => {
    columns.forEach((column) => {
      cells[`${column.weekday}-${row.startSection}`] = {
        weekday: column.weekday,
        startSection: row.startSection,
        endSection: row.endSection,
        items: []
      };
    });
  });

  const ignoreText = /^(时间段|节次|上午|下午|晚上|讲课|实验|实践|上机)$/;
  elements.forEach((el) => {
    if (el.y <= headerBottomY) return;
    if (ignoreText.test(el.text)) return;
    if (el.text.includes('打印时间') || el.text.includes('班课表') || el.text.includes('学年') || el.text.includes('专业')) return;
    if (/^\d+$/.test(el.text) && el.x < headers[0].x) return;

    const column = columns.find((item) => el.x >= item.left && el.x < item.right);
    const row = rows.find((item) => el.y >= item.top && el.y < item.bottom);
    if (!column || !row) return;

    cells[`${column.weekday}-${row.startSection}`].items.push(el);
  });

  const courses = [];
  Object.keys(cells).forEach((key) => {
    const cell = cells[key];
    const lines = cell.items
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((item) => item.text)
      .filter(Boolean);

    if (!lines.length) return;
    const fullText = lines.join(' ');

    let courseName = '';
    for (const line of lines) {
      if (
        !/^\d+$/.test(line) &&
        !line.includes('节') &&
        !line.includes('周') &&
        !line.includes('学时') &&
        !line.includes('学分') &&
        !line.includes('校区') &&
        line.length >= 2
      ) {
        courseName = line.replace(/\(\d+\)$/, '').trim();
        break;
      }
    }
    if (!courseName) return;

    const sectionMatch = fullText.match(/\((\d+)-(\d+)节\)/);
    const weekMatch = fullText.match(/(\d+)-(\d+)周/);
    const teacherMatch = fullText.match(/\/([\u4e00-\u9fa5]{2,4})\/(?:总学时|学时|学分)/);
    const locationMatch =
      fullText.match(/(?:校区)?([^/\s]+(?:教室|实验室|实训室|机房|体育馆))/) ||
      fullText.match(/(未排地点|未排)/);

    let classroom = locationMatch ? locationMatch[1] : '待定';
    if (classroom === '未排地点' || classroom === '未排') classroom = '待定';

    courses.push({
      course_name: courseName,
      teacher_name: teacherMatch ? teacherMatch[1] : '',
      classroom: classroom || '待定',
      weekday: cell.weekday,
      start_section: sectionMatch ? parseInt(sectionMatch[1], 10) : cell.startSection,
      end_section: sectionMatch ? parseInt(sectionMatch[2], 10) : cell.endSection,
      start_week: weekMatch ? parseInt(weekMatch[1], 10) : 1,
      end_week: weekMatch ? parseInt(weekMatch[2], 10) : 18
    });
  });

  return courses.filter((course, index, list) =>
    list.findIndex((item) =>
      item.course_name === course.course_name &&
      item.weekday === course.weekday &&
      item.start_section === course.start_section
    ) === index
  );
}

Page({
  data: {
    status: 'idle',
    recognizedText: '',
    parsedCourses: [],
    errorMsg: '',
    savedCount: 0,
    importDate: '',
  },

  _rawOcrText: '',

  onLoad() {
    this.setData({ importDate: formatDate('YYYY-MM-DD') });
  },

  onShow() {},

  // 检查登录状态，未登录时提示并引导登录，返回是否已登录
  requireAuth() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '需要登录',
        content: '导入课表需要先登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return false;
    }
    return true;
  },

  getApiKey() {
    return OCR_CONFIG.defaultApiKey;
  },

  // ==================== 图片选择与上传 ====================

  onChooseImage() {
    if (!this.requireAuth()) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const tempFileSize = res.tempFiles[0].size;
        if (tempFileSize > 1024 * 1024) {
          this.compressImage(tempFilePath);
        } else {
          this.uploadImage(tempFilePath);
        }
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  compressImage(filePath) {
    wx.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => this.uploadImage(res.tempFilePath),
      fail: () => this.uploadImage(filePath)
    });
  },

  uploadImage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (!OCR_CONFIG.supportedFormats.includes(ext)) {
      wx.showToast({ title: '不支持的图片格式', icon: 'none' });
      return;
    }

    const apiKey = this.getApiKey();
    this.setData({ status: 'uploading', errorMsg: '', parsedCourses: [], recognizedText: '' });

    wx.uploadFile({
      url: `${OCR_CONFIG.baseUrl}${OCR_CONFIG.recognizeEndpoint}`,
      filePath,
      name: 'file',
      formData: { ocrType: 'GENERAL' },
      header: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 120000,
      success: (res) => this.handleResponse(res),
      fail: (err) => {
        console.error('上传失败:', err);
        this.setData({ status: 'failed', errorMsg: '上传失败: ' + (err.errMsg || '网络错误') });
      }
    });
  },

  // ==================== OCR 响应处理 ====================

  handleResponse(res) {
    try {
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

      if (data.error) {
        this.setData({ status: 'failed', errorMsg: data.error.message || '识别失败' });
        return;
      }

      const successCodes = ['0', '200', 0, 200, 'success'];
      if (!successCodes.includes(data.code) && data.code !== undefined) {
        this.setData({ status: 'failed', errorMsg: (data.msg || '识别失败') + ' (错误码: ' + data.code + ')' });
        return;
      }

      // 利用空间位置信息提取结构化课表文本
      var extracted = extractStructuredOcrText(data.data);
      var gridCourses = parseScheduleFromOcrGrid(data.data);
      this._rawOcrText = extracted.plain;
      this._structuredOcrText = extracted.structured;
      this._gridParsedCourses = gridCourses;

      var displayText = extracted.structured || extracted.plain || '(无文字识别结果)';
      this.setData({ status: 'parsing', recognizedText: displayText });

      // 优先用 AI 解析（发送结构化文本），失败则降级为本地解析
      if (gridCourses.length > 0) {
        console.log('[Import] Grid parse success:', gridCourses.length);
        this.onParseComplete(gridCourses, extracted.structured || extracted.plain);
      } else {
        this.aiParseSchedule(extracted.structured || extracted.plain);
      }

    } catch (e) {
      console.error('解析响应失败:', e);
      this.setData({ status: 'failed', errorMsg: '响应解析失败: ' + e.message });
    }
  },

  // AI 智能解析课程表
  aiParseSchedule(ocrText) {
    wx.cloud.callFunction({
      name: 'parse-schedule',
      data: { ocrText: ocrText },
      success: (res) => {
        const result = res.result;
        if (result && result.success && result.courses && result.courses.length > 0) {
          console.log('[Import] AI 解析成功:', result.courses.length, '门课程');
          // AI 返回的字段名映射到前端展示所需的字段名
          const courses = result.courses.map(c => ({
            course_name: c.course_name,
            teacher_name: c.teacher || '',
            classroom: c.location || '待定',
            weekday: c.weekday,
            start_section: c.start_section,
            end_section: c.end_section,
            start_week: c.start_week,
            end_week: c.end_week,
          }));
          this.onParseComplete(courses, ocrText);
        } else {
          console.warn('[Import] AI 解析无结果，降级为本地解析', result);
          this.fallbackLocalParse(ocrText);
        }
      },
      fail: (err) => {
        console.warn('[Import] AI 解析调用失败，降级为本地解析:', err);
        this.fallbackLocalParse(ocrText);
      }
    });
  },

  // 本地解析兜底：优先用结构化格式，回退到纯文本
  fallbackLocalParse(ocrText) {
    var courses = [];
    if (this._gridParsedCourses && this._gridParsedCourses.length > 0) {
      courses = this._gridParsedCourses;
    }
    if (courses.length === 0 && this._structuredOcrText) {
      courses = this.parseStructuredText(this._structuredOcrText);
    }
    if (courses.length === 0) {
      courses = this.parseScheduleText(this._rawOcrText || ocrText);
    }
    this.onParseComplete(courses, ocrText);
  },

  onParseComplete(courses, ocrText) {
    courses.forEach(c => {
      c.weekdayName = WEEKDAY_NAMES[c.weekday] || '一';
      c.weekday = parseInt(c.weekday) || 1;
      c.start_section = parseInt(c.start_section) || 1;
      c.end_section = parseInt(c.end_section) || 2;
      c.start_week = parseInt(c.start_week) || 1;
      c.end_week = parseInt(c.end_week) || 16;
      c.course_name = (c.course_name || '').trim();
      c.teacher_name = (c.teacher_name || '').trim();
      c.classroom = (c.classroom || '').trim();
    });

    const validCourses = courses.filter(c =>
      c.course_name && c.course_name.length >= 2 &&
      c.weekday >= 1 && c.weekday <= 7
    );

    this.setData({
      status: 'success',
      recognizedText: ocrText || '(无文字识别结果)',
      parsedCourses: validCourses
    });

    if (validCourses.length > 0) {
      wx.showToast({ title: `识别到 ${validCourses.length} 门课程`, icon: 'success' });
    } else {
      wx.showToast({ title: '未能解析出课程，请检查图片', icon: 'none', duration: 2500 });
    }
  },

  // ==================== 结构化格式解析（基于空间位置重建） ====================

  parseStructuredText(text) {
    if (!text) return [];

    var weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
    var courses = [];

    // 按 [星期X 第N-M节] 分割成单元格块
    var cellPattern = /\[星期([一二三四五六日天])\s*第(\d+)-(\d+)节\]/g;
    var blocks = [];
    var match;
    var lastIndex = 0;

    while ((match = cellPattern.exec(text)) !== null) {
      if (blocks.length > 0) {
        blocks[blocks.length - 1].content = text.slice(blocks[blocks.length - 1].startIdx, match.index).trim();
      }
      blocks.push({
        weekday: weekdayMap[match[1]] || 1,
        startSection: parseInt(match[2]),
        endSection: parseInt(match[3]),
        startIdx: match.index + match[0].length,
        content: ''
      });
      lastIndex = match.index + match[0].length;
    }
    if (blocks.length > 0) {
      blocks[blocks.length - 1].content = text.slice(lastIndex).trim();
    }

    blocks.forEach(function(block) {
      if (!block.content) return;

      var lines = block.content.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
      if (lines.length === 0) return;

      // 跳过空单元格标记（如果下一个单元格紧跟）
      if (lines[0].indexOf('[星期') === 0) return;

      // --- 提取课程名 ---
      // 找到第一个不包含节次、周次、学时等信息的文本作为课程名
      var courseName = '';
      for (var li = 0; li < lines.length; li++) {
        var line = lines[li];
        // 跳过包含节次、周次、学时、学分等信息的行
        if (line.includes('节)') || line.includes('周/') || line.includes('总学时') ||
            line.includes('学分') || /^[:：]/.test(line) || /^分[:：]/.test(line)) {
          continue;
        }
        // 找到第一个有效的课程名
        if (line.length >= 2 && /[\u4e00-\u9fa5]/.test(line)) {
          courseName = line.replace(/\s*[（(]\d+[）)]\s*$/, '').trim();
          break;
        }
      }

      // 跳过非课程行
      if (!courseName || courseName.length < 2) return;
      if (/^[（(]|^[:：]|学时|学分|校区|排地点|待定/.test(courseName)) return;

      // --- 合并所有行的文本用于提取详细信息 ---
      var allContent = lines.join(' ');

      // --- 提取周次 ---
      var startWeek = 1, endWeek = 18;
      var weekMatch = allContent.match(/(\d+)-(\d+)周/);
      if (weekMatch) {
        startWeek = parseInt(weekMatch[1]);
        endWeek = parseInt(weekMatch[2]);
      }

      // --- 提取教师和教室 ---
      // OCR会把文本断行，如"象湖校区人" + "工智能综合应用实训室1/万" + "志强/总学时:72"
      // 先拼接所有行，再按"/"分割提取
      var teacher = '';
      var classroom = '';

      // 尝试从拼接文本中提取地点和教师
      // 常见格式: "XXX校区 地点/教师姓名/总学时:N/学分:N"
      // 或: "未排地点/教师姓名/总学时:N"
      var slashParts = allContent.split('/');
      for (var p = 0; p < slashParts.length; p++) {
        var part = slashParts[p].trim();
        // 提取教室（包含教室/实验室/实训室/机房/楼/多媒体等关键词）
        if (/教室|实验室|实训室|机房|楼|多媒体/.test(part) && !classroom) {
          // 清理前缀杂文（如"象湖校区人工智能综合应用实训室1"中提取"人工智能综合应用实训室1"）
          var locMatch = part.match(/([\u4e00-\u9fa5\d#]+(?:教室|实验室|实训室|机房|楼)\d*)/);
          classroom = locMatch ? locMatch[1].replace(/\s+/g, '') : part.replace(/\s+/g, '');
        }
        // 提取教师名（2-4个中文字符，不含关键词）
        if (!teacher) {
          // 从part中找连续2-4个中文字的人名
          var nameMatch = part.match(/([\u4e00-\u9fa5]{2,4})(?=\/|$)/);
          if (nameMatch && !/学时|学分|校区|地点|总|排|节|周|未|象湖|多媒体|教室|实验|实训|机房|楼/.test(nameMatch[1])) {
            teacher = nameMatch[1].replace(/\s+/g, '');
          }
        }
      }

      // 如果没从"/"格式提取到教师，尝试独立行提取
      if (!teacher) {
        for (var li = 1; li < lines.length; li++) {
          var lineNameMatch = lines[li].match(/^([\u4e00-\u9fa5]{2,4})$/);
          if (lineNameMatch && !/学时|学分|校区|地点|总/.test(lineNameMatch[1])) {
            teacher = lineNameMatch[1].replace(/\s+/g, '');
            break;
          }
        }
      }

      // 处理"未排地点"
      if (!classroom && /未排地点|未排/.test(allContent)) {
        classroom = '待定';
      }

      courses.push({
        course_name: courseName,
        teacher_name: teacher,
        classroom: classroom || '待定',
        weekday: block.weekday,
        start_section: block.startSection,
        end_section: block.endSection,
        start_week: startWeek,
        end_week: endWeek,
      });
    });

    // 去重（同课同星期同节次）
    var unique = [];
    courses.forEach(function(c) {
      var dup = unique.find(function(u) {
        return u.course_name === c.course_name && u.weekday === c.weekday && u.start_section === c.start_section;
      });
      if (!dup) unique.push(c);
    });

    console.log('[Import] 结构化解析结果:', unique.length, '门课程');
    return unique;
  },

  // ==================== 本地解析课程表（纯文本回退） ====================

  parseScheduleText(text) {
    if (!text) return [];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const courses = [];

    const weekdayPattern = /(?:星期|周)([一二三四五六日天])/;
    const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
    const sectionPattern = /[（(]?(\d+)-(\d+)节[）)]?/;
    const weekPattern = /(\d+)-(\d+)周/;

    // 判断一行是否应该跳过（不是课程名）
    function shouldSkip(line) {
      // 纯数字或很短
      if (/^\d+$/.test(line)) return true;
      if (line.length < 2) return true;

      // 以 "(" 或 "（" 开头且包含 "节" → 节次信息行，如 "(5-6节)/象湖校区"
      if (/^[（(]/.test(line) && /节/.test(line)) return true;

      // 以 ":" 或 "：" 开头 → 元数据，如 ":36/学分:20"
      if (/^[:：]/.test(line)) return true;

      // 包含"学时"或"学分" → 元数据
      if (/学时|学分/.test(line)) return true;

      // 包含"校区" → 地点信息，不是课程名
      if (/校区/.test(line)) return true;

      // 包含"排地点"或"待定" → 元数据
      if (/排地点|待定/.test(line)) return true;

      // "讲课"/"实验"/"实践"/"上机" 组合 → 表头行
      if (/讲课|上机/.test(line) && /实验|实践/.test(line)) return true;

      // 时间段/节次/上下午/晚上 等表头
      if (/^(时间段?|节次|[上下]午|晚上|备注)$/.test(line)) return true;

      // 年级/专业/打印时间等
      if (/^专业[:：]|^打印时间|^\d{4}-\d{4}|^2\d级/.test(line)) return true;

      // 以 "/" 开头
      if (/^[\/\\]/.test(line)) return true;

      // 纯节次周次信息行，如 "1-18周" 或 "(3-4节)"
      if (/^\d+-\d+周$/.test(line)) return true;
      if (/^[（(]\d+-\d+节[）)]$/.test(line)) return true;

      return false;
    }

    // 判断是否是详情行（教室/教师/学时 格式，用 "/" 分隔的信息行）
    // 如 "多媒体教室3/胡春春/总学时" 或 "计算机教室2/吉世杰/总学时"
    function isDetailLine(line) {
      // 包含 "/" 且有中文，且包含教室/楼/实验室等关键字或短中文人名
      if (line.indexOf('/') === -1) return false;
      var parts = line.split('/');
      if (parts.length < 2) return false;
      // 包含教室/楼等地点关键字
      if (/教室|实验室|机房|楼|多媒体/.test(line)) return true;
      // 多段短中文，像 "人名/地点/学时"
      var shortParts = parts.filter(function(p) { return /^[\u4e00-\u9fa5]{2,5}$/.test(p.trim()); });
      if (shortParts.length >= 2) return true;
      return false;
    }

    // 从详情行中提取教室和教师
    function extractDetail(line) {
      var info = { teacher: '', classroom: '' };
      var parts = line.split('/').map(function(p) { return p.trim(); });
      for (var k = 0; k < parts.length; k++) {
        var part = parts[k];
        if (/教室|实验室|机房|楼|多媒体/.test(part) && !info.classroom) {
          info.classroom = part;
        } else if (/^[\u4e00-\u9fa5]{2,3}$/.test(part) && !/学时|学分|校区|地点/.test(part) && !info.teacher) {
          info.teacher = part;
        }
      }
      return info;
    }

    // 当前上下文
    var currentWeekday = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // 跳过垃圾行
      if (shouldSkip(line)) continue;

      // 检测星期标题行
      var wdMatch = line.match(weekdayPattern);
      if (wdMatch && line.length <= 6) {
        currentWeekday = weekdayMap[wdMatch[1]] || 1;
        continue;
      }

      // 跳过详情行（教室/教师/学时 这种格式）
      if (isDetailLine(line)) continue;

      // 跳过以数字开头的行（如 "2024" 等）
      if (/^\d/.test(line)) continue;

      // 到这里认为可能是课程名
      // 清理课程名：去掉尾部的 (数字) 和混在里面的节次/周次信息
      var courseName = line
        .replace(sectionPattern, '')   // 去掉 (1-2节)
        .replace(weekPattern, '')      // 去掉 1-18周
        .replace(/[\/\\].*$/, '')      // 去掉 / 后面的内容（教师/学时等）
        .replace(/[（(]\d+[）)]$/, '') // 去掉尾部 (数字)
        .trim();

      // 课程名验证：至少3个字符，且包含中文
      if (courseName.length < 3) continue;
      if (!/[\u4e00-\u9fa5]{2,}/.test(courseName)) continue;

      // 再次检查清理后的名字是否为垃圾
      if (/^排|^总|^合|学时|学分|校区|待定|讲课|上机/.test(courseName)) continue;

      var course = {
        course_name: courseName,
        teacher_name: '',
        classroom: '',
        weekday: currentWeekday || 1,
        start_section: 0,
        end_section: 0,
        start_week: 1,
        end_week: 16
      };

      // 从当前行提取节次和周次
      var lineSecMatch = line.match(sectionPattern);
      if (lineSecMatch) {
        course.start_section = parseInt(lineSecMatch[1]);
        course.end_section = parseInt(lineSecMatch[2]);
      }
      var lineWeekMatch = line.match(weekPattern);
      if (lineWeekMatch) {
        course.start_week = parseInt(lineWeekMatch[1]);
        course.end_week = parseInt(lineWeekMatch[2]);
      }

      // 向后看几行，提取节次、周次、教室、教师
      for (var j = 1; j <= 5 && (i + j) < lines.length; j++) {
        var next = lines[i + j];

        // 遇到新星期标题或新课程名就停
        if (weekdayPattern.test(next) && next.length <= 6) break;
        // 遇到另一个看起来像课程名的行就停
        if (!shouldSkip(next) && !isDetailLine(next) && !/^\d/.test(next) &&
            /[\u4e00-\u9fa5]{3,}/.test(next) && !sectionPattern.test(next) &&
            !/学时|学分|校区|排地点|待定/.test(next)) break;

        // 提取节次
        var secMatch = next.match(sectionPattern);
        if (secMatch && course.start_section === 0) {
          course.start_section = parseInt(secMatch[1]);
          course.end_section = parseInt(secMatch[2]);
        }

        // 提取周次
        var wkMatch = next.match(weekPattern);
        if (wkMatch) {
          course.start_week = parseInt(wkMatch[1]);
          course.end_week = parseInt(wkMatch[2]);
        }

        // 提取教室和教师
        if (isDetailLine(next)) {
          var detail = extractDetail(next);
          if (detail.teacher && !course.teacher_name) course.teacher_name = detail.teacher;
          if (detail.classroom && !course.classroom) course.classroom = detail.classroom;
        }
      }

      // 如果没识别到节次，跳过（无法确定上课时间）
      if (course.start_section === 0) {
        course.start_section = 1;
        course.end_section = 2;
      }

      // 去重
      var dup = courses.find(function(c) {
        return c.course_name === course.course_name &&
               c.weekday === course.weekday &&
               c.start_section === course.start_section;
      });

      if (!dup) {
        courses.push(course);
      }
    }

    console.log('[Import] 本地解析结果:', courses.length, '门课程');
    return courses;
  },

  // ==================== 确认导入（存入数据库） ====================

  onConfirm() {
    const courses = this.data.parsedCourses;
    if (!courses || courses.length === 0) {
      wx.showToast({ title: '没有可导入的课程', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token) {
      this.requireAuth();
      return;
    }

    const user = wx.getStorageSync('user');
    if (user && user.id) {
      this.saveCourses(user.id, courses);
    } else {
      this.setData({ status: 'saving' });
      wx.showLoading({ title: '正在导入...' });

      wx.cloud.callFunction({
        name: 'db-query',
        data: {
          sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1',
          params: [token]
        },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            const userId = result.data[0].id;
            wx.setStorageSync('user', Object.assign({}, user || {}, { id: userId }));
            wx.hideLoading();
            this.saveCourses(userId, courses);
          } else {
            wx.hideLoading();
            wx.showToast({ title: '用户信息异常，请重新登录', icon: 'none' });
            setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500);
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '查询用户失败', icon: 'none' });
          this.setData({ status: 'success' });
        }
      });
    }
  },

  saveCourses(userId, courses) {
    this.setData({ status: 'saving' });
    wx.showLoading({ title: '正在导入...' });

    const token = wx.getStorageSync('token') || '';
    const importDate = formatDate('YYYY-MM-DD HH:mm:ss');

    // 先删除该用户的旧课程，避免重复导入
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'DELETE FROM courses WHERE user_id = ?',
        params: [userId]
      },
      success: (delRes) => {
        console.log('[Import] 已清除旧课程数据', delRes.result);
        this._insertCourses(userId, courses, token, importDate);
      },
      fail: (err) => {
        console.warn('[Import] 清除旧数据失败，仍继续导入:', err);
        this._insertCourses(userId, courses, token, importDate);
      }
    });
  },

  _insertCourses(userId, courses, token, importDate) {
    const values = courses.map(c => {
      return [
        userId,
        c.course_name,
        c.teacher_name || '',
        c.classroom || '',
        c.weekday,
        c.start_section,
        c.end_section,
        c.start_week,
        c.end_week,
        token
      ];
    });

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatParams = values.flat();

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `INSERT INTO courses (user_id, course_name, teacher, location, weekday, start_section, end_section, start_week, end_week, _openid) VALUES ${placeholders}`,
        params: flatParams
      },
      success: (res) => {
        wx.hideLoading();
        const result = res.result;
        if (result && result.success) {
          const count = courses.length;
          this.setData({ status: 'idle', savedCount: count, parsedCourses: [], recognizedText: '' });
          wx.setStorageSync('lastImportDate', importDate);

          wx.showModal({
            title: '导入成功',
            content: `已成功导入 ${count} 门课程到你的课表\n导入时间: ${importDate}`,
            showCancel: false,
            success: () => {
              wx.navigateTo({ url: '/pages/courses/courses' });
            }
          });
        } else {
          this.setData({ status: 'failed', errorMsg: '保存失败: ' + (result?.message || '数据库错误') });
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[Import] 保存课程失败:', err);
        this.setData({ status: 'failed', errorMsg: '保存失败: ' + (err.errMsg || '云函数调用失败') });
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  onRetry() {
    this.setData({ status: 'idle', errorMsg: '', parsedCourses: [], recognizedText: '' });
  },

  // 底部导航
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
});
