// 简单日期格式化
const { importDefaultTemplateCourses } = require('../../utils/default-schedule-import');
const { getLoginToken, getStoredUser, hasLoginSession, updateStoredUser, clearLoginSession } = require('../../utils/auth');
const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');

const EDITOR_WEEKDAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const EDITOR_SECTION_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

function formatWeekdayDisplay(weekday) {
  return EDITOR_WEEKDAY_OPTIONS[Number(weekday) - 1] || '周一';
}

function clampNumber(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeParsedCourses(courses) {
  return (courses || [])
    .map((course) => {
      const weekday = clampNumber(course.weekday, 1, 7, 1);
      const startSection = clampNumber(course.start_section, 1, 12, 1);
      const endSection = clampNumber(course.end_section, startSection, 12, Math.max(startSection, 2));
      const startWeek = clampNumber(course.start_week, 1, 30, 1);
      const endWeek = clampNumber(course.end_week, startWeek, 30, Math.max(startWeek, 16));

      return {
        course_name: String(course.course_name || '').trim(),
        teacher_name: String(course.teacher_name || '').trim(),
        classroom: String(course.classroom || '').trim(),
        weekday,
        weekdayName: formatWeekdayDisplay(weekday),
        start_section: startSection,
        end_section: endSection,
        start_week: startWeek,
        end_week: endWeek,
      };
    })
    .filter((course) => course.course_name && course.course_name.length >= 2)
    .sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      if (a.start_section !== b.start_section) return a.start_section - b.start_section;
      return a.course_name.localeCompare(b.course_name, 'zh-CN');
    });
}

function getCourseIdentityKey(course) {
  const weekday = Number(course.weekday) || 0;
  const courseName = normalizeCourseToken(String(course.course_name || '').trim()) || String(course.course_name || '').trim();
  return `${weekday}-${courseName}`;
}

function getCourseConfidenceScore(course) {
  let score = 0;
  const teacher = String(course.teacher_name || '').trim();
  const classroom = String(course.classroom || '').trim();
  const courseName = String(course.course_name || '').trim();

  if (courseName) score += Math.min(courseName.length, 12);
  if (teacher) score += 6;
  if (classroom && classroom !== '待定') score += 8;

  const startSection = Number(course.start_section) || 0;
  const endSection = Number(course.end_section) || 0;
  if (startSection > 0 && endSection >= startSection) {
    score += 4 + (endSection - startSection);
  }

  const startWeek = Number(course.start_week) || 0;
  const endWeek = Number(course.end_week) || 0;
  if (startWeek > 0 && endWeek >= startWeek) {
    score += 2;
  }

  return score;
}

function mergeParsedCourseBatches(batches) {
  const courseMap = new Map();

  (batches || []).forEach((batch) => {
    normalizeParsedCourses(batch).forEach((course) => {
      const key = getCourseIdentityKey(course);
      const existing = courseMap.get(key);
      if (!existing) {
        courseMap.set(key, { ...course });
        return;
      }

      const existingScore = getCourseConfidenceScore(existing);
      const currentScore = getCourseConfidenceScore(course);
      const preferred = currentScore >= existingScore ? course : existing;
      const fallback = preferred === course ? existing : course;

      courseMap.set(key, {
        ...fallback,
        ...preferred,
        teacher_name: preferred.teacher_name || fallback.teacher_name,
        classroom: preferred.classroom && preferred.classroom !== '待定' ? preferred.classroom : fallback.classroom,
        start_section: preferred.start_section || fallback.start_section,
        end_section: preferred.end_section || fallback.end_section,
        start_week: Math.min(fallback.start_week || 99, preferred.start_week || 99),
        end_week: Math.max(fallback.end_week || 0, preferred.end_week || 0)
      });
    });
  });

  return Array.from(courseMap.values());
}

function getBatchMetrics(courses) {
  const normalized = normalizeParsedCourses(courses);
  const weekdayCounter = new Map();

  normalized.forEach((course) => {
    weekdayCounter.set(course.weekday, (weekdayCounter.get(course.weekday) || 0) + 1);
  });

  const uniqueWeekdays = weekdayCounter.size;
  const maxWeekdayCount = Math.max(0, ...Array.from(weekdayCounter.values()));
  const filledMetaCount = normalized.filter((course) =>
    (course.teacher_name && course.teacher_name.trim()) ||
    (course.classroom && course.classroom.trim() && course.classroom !== '待定')
  ).length;

  return {
    courses: normalized,
    count: normalized.length,
    uniqueWeekdays,
    maxWeekdayCount,
    filledMetaCount
  };
}

function scoreBatchForBase(source, courses) {
  const metrics = getBatchMetrics(courses);
  if (!metrics.count) {
    return { source, courses: metrics.courses, score: -999, metrics };
  }

  let score = 0;
  score += metrics.uniqueWeekdays * 20;
  score += metrics.count;
  score += metrics.filledMetaCount * 2;

  if (metrics.maxWeekdayCount >= Math.max(5, Math.ceil(metrics.count * 0.7))) {
    score -= 40;
  }

  if (metrics.count > 20) {
    score -= (metrics.count - 20) * 3;
  }

  if (source === 'grid') {
    score += 12;
  } else if (source === 'structured') {
    score += 4;
  }

  return {
    source,
    courses: metrics.courses,
    score,
    metrics
  };
}

function enrichBaseCourses(baseCourses, candidateGroups) {
  const normalizedBase = normalizeParsedCourses(baseCourses).map((course) => ({ ...course }));

  normalizedBase.forEach((baseCourse) => {
    const baseName = normalizeCourseToken(baseCourse.course_name);

    candidateGroups.forEach((group) => {
      const match = normalizeParsedCourses(group.courses).find((course) => {
        const candidateName = normalizeCourseToken(course.course_name);
        if (!candidateName || candidateName !== baseName) return false;

        const sameSection = Math.abs((Number(course.start_section) || 0) - (Number(baseCourse.start_section) || 0)) <= 2;
        const sameWeekday = Number(course.weekday) === Number(baseCourse.weekday);
        return sameWeekday || sameSection;
      });

      if (!match) return;

      if (!baseCourse.teacher_name && match.teacher_name) {
        baseCourse.teacher_name = match.teacher_name;
      }
      if ((!baseCourse.classroom || baseCourse.classroom === '待定') && match.classroom && match.classroom !== '待定') {
        baseCourse.classroom = match.classroom;
      }
      if ((!baseCourse.start_week || baseCourse.start_week === 1) && match.start_week) {
        baseCourse.start_week = match.start_week;
      }
      if ((!baseCourse.end_week || baseCourse.end_week === 16 || baseCourse.end_week === 18) && match.end_week) {
        baseCourse.end_week = Math.max(baseCourse.end_week || 0, match.end_week);
      }
    });
  });

  return normalizeParsedCourses(normalizedBase);
}

function looksLikeCollapsedWeekdayResult(courses) {
  const metrics = getBatchMetrics(courses);
  if (metrics.count < 5) return false;
  if (metrics.uniqueWeekdays <= 1) return true;
  return metrics.maxWeekdayCount >= Math.ceil(metrics.count * 0.7);
}

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

const OCR_PREPROCESS_CONFIG = {
  maxEdge: 2200,
  cropPadding: 16,
  darkPixelThreshold: 245,
  rowDarkRatio: 0.004,
  colDarkRatio: 0.004,
  contrastFactor: 1.16,
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

function getElementCenterX(element) {
  return Number(element.x || 0) + Number(element.width || 0) / 2;
}

function getElementCenterY(element) {
  return Number(element.y || 0) + Number(element.height || 0) / 2;
}

function getElementBounds(element) {
  const x = Number(element.x || 0);
  const y = Number(element.y || 0);
  const width = Math.max(Number(element.width || 0), 1);
  const height = Math.max(Number(element.height || 0), 1);
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height
  };
}

function getRangeOverlap(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeCropBoundsFromImageData(imageData, width, height) {
  if (!imageData || !imageData.data || !width || !height) {
    return { left: 0, top: 0, width, height };
  }

  const { data } = imageData;
  const rowThreshold = Math.max(2, Math.floor(width * OCR_PREPROCESS_CONFIG.rowDarkRatio));
  const colThreshold = Math.max(2, Math.floor(height * OCR_PREPROCESS_CONFIG.colDarkRatio));

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  const isDark = (index) => {
    const alpha = data[index + 3];
    if (alpha === 0) return false;
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    return gray < OCR_PREPROCESS_CONFIG.darkPixelThreshold;
  };

  for (let y = 0; y < height; y += 1) {
    let darkCount = 0;
    for (let x = 0; x < width; x += 1) {
      if (isDark((y * width + x) * 4)) darkCount += 1;
    }
    if (darkCount >= rowThreshold) {
      top = y;
      break;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    let darkCount = 0;
    for (let x = 0; x < width; x += 1) {
      if (isDark((y * width + x) * 4)) darkCount += 1;
    }
    if (darkCount >= rowThreshold) {
      bottom = y;
      break;
    }
  }

  for (let x = 0; x < width; x += 1) {
    let darkCount = 0;
    for (let y = 0; y < height; y += 1) {
      if (isDark((y * width + x) * 4)) darkCount += 1;
    }
    if (darkCount >= colThreshold) {
      left = x;
      break;
    }
  }

  for (let x = width - 1; x >= 0; x -= 1) {
    let darkCount = 0;
    for (let y = 0; y < height; y += 1) {
      if (isDark((y * width + x) * 4)) darkCount += 1;
    }
    if (darkCount >= colThreshold) {
      right = x;
      break;
    }
  }

  if (right <= left || bottom <= top) {
    return { left: 0, top: 0, width, height };
  }

  const padding = OCR_PREPROCESS_CONFIG.cropPadding;
  const croppedLeft = clamp(left - padding, 0, width - 1);
  const croppedTop = clamp(top - padding, 0, height - 1);
  const croppedRight = clamp(right + padding, croppedLeft + 1, width);
  const croppedBottom = clamp(bottom + padding, croppedTop + 1, height);

  return {
    left: croppedLeft,
    top: croppedTop,
    width: croppedRight - croppedLeft,
    height: croppedBottom - croppedTop
  };
}

function enhanceImageDataForOcr(imageData) {
  if (!imageData || !imageData.data) return imageData;

  const { data } = imageData;
  let graySum = 0;
  let pixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    graySum += gray;
    pixelCount += 1;
  }

  const meanGray = pixelCount ? graySum / pixelCount : 220;
  const threshold = clamp(meanGray * 0.94, 160, 225);

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const contrasted = clamp((gray - 128) * OCR_PREPROCESS_CONFIG.contrastFactor + 128, 0, 255);
    const value = contrasted > threshold ? 255 : clamp(contrasted * 0.82, 0, 255);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  return imageData;
}

function findBestColumnForElement(element, columns) {
  const bounds = getElementBounds(element);
  let bestColumn = null;
  let bestScore = -1;

  (columns || []).forEach((column) => {
    const overlap = getRangeOverlap(bounds.left, bounds.right, column.left, column.right);
    if (overlap > bestScore) {
      bestScore = overlap;
      bestColumn = column;
    }
  });

  if (bestColumn && bestScore > 0) return bestColumn;

  const centerX = getElementCenterX(element);
  return (columns || []).reduce((closest, column) => {
    if (!closest) return column;
    return Math.abs(column.centerX - centerX) < Math.abs(closest.centerX - centerX) ? column : closest;
  }, null);
}

function findBestRowForElement(element, rows) {
  const bounds = getElementBounds(element);
  let bestRow = null;
  let bestScore = -1;

  (rows || []).forEach((row) => {
    const overlap = getRangeOverlap(bounds.top, bounds.bottom, row.top, row.bottom);
    if (overlap > bestScore) {
      bestScore = overlap;
      bestRow = row;
    }
  });

  if (bestRow && bestScore > 0) return bestRow;

  const centerY = getElementCenterY(element);
  return (rows || []).reduce((closest, row) => {
    if (!closest) return row;
    const rowCenter = (row.top + row.bottom) / 2;
    const closestCenter = (closest.top + closest.bottom) / 2;
    return Math.abs(rowCenter - centerY) < Math.abs(closestCenter - centerY) ? row : closest;
  }, null);
}

function buildGroupedRows(sectionMarkers) {
  const groups = [];
  for (let i = 0; i < sectionMarkers.length; i += 2) {
    const first = sectionMarkers[i];
    const second = sectionMarkers[i + 1] || first;
    groups.push({
      startSection: first.section,
      endSection: second.section,
      center: (first.centerY + second.centerY) / 2
    });
  }

  return groups.map((group, index) => {
    const prev = groups[index - 1];
    const next = groups[index + 1];
    return {
      startSection: group.startSection,
      endSection: group.endSection,
      top: prev ? (prev.center + group.center) / 2 : group.center - 120,
      bottom: next ? (group.center + next.center) / 2 : group.center + 120
    };
  });
}

/*
function detectCourseNameFromLines(lines) {
  for (const line of lines || []) {
    if (
      !/^\d+$/.test(line) &&
      !line.includes('鑺?) &&
      !line.includes('鍛?) &&
      !line.includes('瀛︽椂') &&
      !line.includes('瀛﹀垎') &&
      !line.includes('鏍″尯') &&
      line.length >= 2
    ) {
      return line.replace(/\(\d+\)$/, '').trim();
    }
  }
  return '';
}

function hasCellMetadata(lines) {
  const fullText = (lines || []).join(' ');
  return /(\d+)-(\d+)鍛?/.test(fullText) ||
    /\((\d+)-(\d+)鑺俓)/.test(fullText) ||
    /鏁欏|瀹為獙瀹瀹炶瀹鏈烘埧|鏍″尯|鏈帓鍦扮偣|鏈帓/.test(fullText) ||
    /\/[\u4e00-\u9fa5]{2,4}\//.test(fullText);
}

*/
function looksLikeWeekInfo(text) {
  return /(?:^|[^0-9])\d{1,2}\s*[-~]\s*\d{1,2}\s*\u5468/.test(text) || /^\d{1,2}\u5468$/.test(text);
}

function looksLikeSectionInfo(text) {
  return /\(?\d{1,2}\s*[-~]\s*\d{1,2}\s*\u8282\)?/.test(text);
}

function looksLikeLocationLine(text) {
  if (!text) return false;
  return /(\u6559\u5ba4|\u5b9e\u9a8c\u5ba4|\u5b9e\u8bad\u5ba4|\u673a\u623f|\u4f53\u80b2\u9986|\u6821\u533a|\u672a\u6392|\u64cd\u573a|\u7ebf\u4e0a|\u56fe\u4e66\u9986)/.test(text) ||
    /^[A-Za-z]{0,3}\d{2,}[A-Za-z0-9-]*$/.test(text) ||
    /^\d{3,}[A-Za-z0-9-]*$/.test(text);
}

function looksLikeTeacherInfo(text) {
  return /^\/?[\u4e00-\u9fa5]{2,4}\/?(?:\u603b\u5b66\u65f6|\u5b66\u5206)?$/.test(text);
}

function looksLikeStatsLine(text) {
  return /(\u603b\u5b66\u65f6|\u5b66\u5206|\u5b66\u65f6|\u7406\u8bba|\u5b9e\u9a8c|\u4e0a\u673a|\u5b9e\u8df5|[:\uff1a]\d)/.test(text);
}

function looksLikeCompositeMetaLine(text) {
  if (!text || !text.includes('/')) return false;
  return looksLikeLocationLine(text) || looksLikeStatsLine(text) || /\/[\u4e00-\u9fa5]{2,4}(?:\/|$)/.test(text);
}

function isLikelyCourseTitle(text) {
  if (!text || text.length < 2) return false;
  if (!/[\u4e00-\u9fa5A-Za-z]/.test(text)) return false;
  if (looksLikeWeekInfo(text) || looksLikeSectionInfo(text) || looksLikeLocationLine(text)) return false;
  if (looksLikeStatsLine(text) || looksLikeCompositeMetaLine(text)) return false;
  if (/^\d+[A-Za-z]?[\u4e00-\u9fa5]/.test(text)) return false;
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(text) && looksLikeTeacherInfo(text)) return false;
  return true;
}

function scoreCourseNameCandidate(text) {
  if (!text || /^\d+$/.test(text)) return -100;
  if (looksLikeWeekInfo(text) || looksLikeSectionInfo(text) || looksLikeLocationLine(text)) return -60;
  if (looksLikeStatsLine(text) || looksLikeCompositeMetaLine(text)) return -80;

  let score = 0;
  if (/[\u4e00-\u9fa5]/.test(text)) score += 8;
  if (/[A-Za-z]/.test(text)) score += 3;
  if (/[\(\)\uff08\uff09]/.test(text)) score += 1;
  score += Math.min(text.length, 14);

  if (/^[\u4e00-\u9fa5]{2,4}$/.test(text) && looksLikeTeacherInfo(text)) {
    score -= 4;
  }

  return score;
}

function detectCourseNameFromLines(lines) {
  const candidates = (lines || [])
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .filter((line) => isLikelyCourseTitle(line))
    .map((line) => ({
      line,
      score: scoreCourseNameCandidate(line)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.line.length - b.line.length);

  return candidates.length ? candidates[0].line.replace(/\(\d+\)$/, '').trim() : '';
}

function hasCellMetadata(lines) {
  return (lines || []).some((line) => {
    const text = String(line || '').trim();
    if (!text) return false;
    return looksLikeWeekInfo(text) || looksLikeSectionInfo(text) || looksLikeLocationLine(text) || looksLikeStatsLine(text) || /\/[\u4e00-\u9fa5]{2,4}\//.test(text);
  });
}

function normalizeCourseToken(text) {
  return String(text || '')
    .replace(/[\s\(\)\uff08\uff09]/g, '')
    .replace(/\d+/g, '')
    .toLowerCase();
}

function shouldMergeCourseCells(currentCell, nextCell) {
  if (!currentCell || !nextCell) return false;
  if (currentCell.weekday !== nextCell.weekday) return false;
  if (nextCell.startSection > currentCell.endSection + 1) return false;

  const currentName = normalizeCourseToken(currentCell.courseName);
  const nextName = normalizeCourseToken(nextCell.courseName);

  if (currentName && nextName) {
    return currentName === nextName;
  }

  if (currentName && !nextName) {
    return nextCell.metadataOnly;
  }

  if (!currentName && nextName) {
    return currentCell.metadataOnly;
  }

  return false;
}

function detectWeekRange(text) {
  const fullText = String(text || '');
  const rangeMatch = fullText.match(/(\d{1,2})\s*[-~]\s*(\d{1,2})\s*\u5468/);
  if (rangeMatch) {
    return {
      startWeek: parseInt(rangeMatch[1], 10),
      endWeek: parseInt(rangeMatch[2], 10)
    };
  }

  const singleMatch = fullText.match(/(^|[^0-9])(\d{1,2})\u5468(?!\d)/);
  if (singleMatch) {
    const week = parseInt(singleMatch[2], 10);
    return { startWeek: week, endWeek: week };
  }

  return null;
}

function detectSectionRange(text) {
  const fullText = String(text || '');
  const rangeMatch = fullText.match(/\(?(\d{1,2})\s*[-~]\s*(\d{1,2})\s*\u8282\)?/);
  if (!rangeMatch) return null;

  return {
    startSection: parseInt(rangeMatch[1], 10),
    endSection: parseInt(rangeMatch[2], 10)
  };
}

function detectTeacherName(lines, courseName) {
  for (const line of lines || []) {
    const match = String(line || '').match(/\/([\u4e00-\u9fa5]{2,4})\//);
    if (match) return match[1];
  }
  for (const line of lines || []) {
    const text = String(line || '').trim();
    if (!text || text === courseName) continue;
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(text) && !looksLikeStatsLine(text) && !looksLikeLocationLine(text)) {
      return text;
    }
  }
  return '';
}

function detectClassroom(lines) {
  for (const line of lines || []) {
    const text = String(line || '').trim();
    if (!text || looksLikeWeekInfo(text) || looksLikeSectionInfo(text)) continue;
    const parts = text.split('/').map((item) => item.trim()).filter(Boolean);
    for (const part of parts) {
      if (looksLikeLocationLine(part) && !looksLikeStatsLine(part)) return part;
    }
    if (looksLikeLocationLine(text) && !looksLikeCompositeMetaLine(text)) return text;
  }
  return '';
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
        weekdayHeaders.push({
          weekday: weekdayMap[name],
          x: el.x,
          y: el.y,
          width: el.width || 0,
          height: el.height || 0,
          centerX: getElementCenterX(el)
        });
      }
    });
  });

  weekdayHeaders.sort((a, b) => a.centerX - b.centerX);
  const headers = [];
  weekdayHeaders.forEach((header) => {
    const duplicated = headers.find((item) => item.weekday === header.weekday || Math.abs(item.centerX - header.centerX) < 20);
    if (!duplicated) headers.push(header);
  });
  if (headers.length < 5) return [];

  const headerBottomY = Math.max.apply(null, headers.map((item) => item.y + (item.height || 0))) + 5;
  const sectionMarkers = [];
  for (let section = 1; section <= 10; section++) {
    const marker = elements.find((el) =>
      el.text === String(section) &&
      getElementCenterX(el) < headers[0].centerX - 20 &&
      getElementCenterY(el) > headerBottomY &&
      (el.width || 0) <= 60
    );
    if (marker) {
      sectionMarkers.push({ section, y: marker.y, centerY: getElementCenterY(marker) });
    }
  }
  sectionMarkers.sort((a, b) => a.y - b.y);
  if (sectionMarkers.length < 2) return [];

  const columns = headers.map((header, index) => {
    const prev = headers[index - 1];
    const next = headers[index + 1];
    return {
      weekday: header.weekday,
      centerX: header.centerX,
      left: prev ? Math.floor((prev.centerX + header.centerX) / 2) : Math.floor(header.centerX - 120),
      right: next ? Math.floor((header.centerX + next.centerX) / 2) : Math.ceil(header.centerX + 120)
    };
  });

  const rows = buildGroupedRows(sectionMarkers);

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
    const centerY = getElementCenterY(el);
    if (centerY <= headerBottomY) return;
    if (ignoreText.test(el.text)) return;
    if (el.text.includes('打印时间') || el.text.includes('班课表') || el.text.includes('学年') || el.text.includes('专业')) return;
    if (/^\d+$/.test(el.text) && getElementCenterX(el) < headers[0].centerX - 20) return;

    const column = findBestColumnForElement(el, columns);
    const row = findBestRowForElement(el, rows);
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

  const cellEntries = Object.keys(cells)
    .map((key) => {
      const cell = cells[key];
      const lines = cell.items
        .slice()
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((item) => item.text)
        .filter(Boolean);

      return {
        key,
        weekday: cell.weekday,
        startSection: cell.startSection,
        endSection: cell.endSection,
        lines,
        fullText: lines.join(' '),
        courseName: detectCourseNameFromLines(lines),
        metadataOnly: hasCellMetadata(lines)
      };
    })
    .filter((cell) => cell.lines.length)
    .sort((a, b) => a.weekday - b.weekday || a.startSection - b.startSection);

  const mergedCells = [];
  cellEntries.forEach((cell) => {
    const lastCell = mergedCells[mergedCells.length - 1];
    if (lastCell && shouldMergeCourseCells(lastCell, cell)) {
      lastCell.endSection = Math.max(lastCell.endSection, cell.endSection);
      lastCell.lines = lastCell.lines.concat(cell.lines);
      lastCell.fullText = lastCell.lines.join(' ');
      lastCell.courseName = detectCourseNameFromLines(lastCell.lines);
      lastCell.metadataOnly = hasCellMetadata(lastCell.lines);
      return;
    }

    mergedCells.push({
      ...cell,
      lines: cell.lines.slice()
    });
  });

  const mergedCourses = mergedCells
    .filter((cell) => cell.courseName)
    .map((cell) => {
      const sectionRange = detectSectionRange(cell.fullText);
      const weekRange = detectWeekRange(cell.fullText);
      const classroom = detectClassroom(cell.lines);

      return {
        course_name: cell.courseName,
        teacher_name: detectTeacherName(cell.lines, cell.courseName),
        classroom: classroom && classroom !== '\u672a\u6392' && classroom !== '\u672a\u6392\u5730\u70b9' ? classroom : '\u5f85\u5b9a',
        weekday: cell.weekday,
        start_section: sectionRange ? sectionRange.startSection : cell.startSection,
        end_section: sectionRange ? sectionRange.endSection : cell.endSection,
        start_week: weekRange ? weekRange.startWeek : 1,
        end_week: weekRange ? weekRange.endWeek : 18
      };
    });

  const finalCourses = mergedCourses.length ? mergedCourses : courses;
  return mergeParsedCourseBatches([finalCourses]);
}

Page({
  data: {
    status: 'idle',
    recognizedText: '',
    parsedCourses: [],
    errorMsg: '',
    savedCount: 0,
    importDate: '',
    shareImportKey: '',
    shareImportLoading: false,
    weekdayOptions: EDITOR_WEEKDAY_OPTIONS,
    sectionOptions: EDITOR_SECTION_OPTIONS,
    editorVisible: false,
    editingIndex: -1,
    editorCourse: null,
  },

  _rawOcrText: '',
  _preprocessCanvas: null,
  _lastOriginalImagePath: '',
  _usingOriginalRetry: false,

  onLoad() {
    this.setData({ importDate: formatDate('YYYY-MM-DD') });
  },

  onShow() {},

  onImportDefaultTemplate() {
    if (!this.requireAuth()) return;

    wx.showModal({
      title: '导入默认课表',
      content: '将使用默认模板课表覆盖你当前的课程，是否继续？',
      confirmText: '立即导入',
      confirmColor: '#c96f3b',
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '导入中...' });
        try {
          const result = await importDefaultTemplateCourses();
          wx.hideLoading();
          wx.showModal({
            title: '导入成功',
            content: `默认课表已导入，共 ${result.count} 门课程。`,
            showCancel: false,
            success: () => {
              wx.switchTab({ url: '/pages/courses/courses' });
            }
          });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: error && error.message ? error.message : '默认课表导入失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 检查登录状态，未登录时提示并引导登录，返回是否已登录
  onShareKeyInput(e) {
    this.setData({
      shareImportKey: String(e.detail.value || '').trim().toUpperCase()
    });
  },

  async onImportByShareKey() {
    if (!this.requireAuth()) return;

    const shareKey = (this.data.shareImportKey || '').trim().toUpperCase();
    if (!shareKey) {
      wx.showToast({ title: '请先输入分享密钥', icon: 'none' });
      return;
    }

    this.setData({ shareImportLoading: true });
    wx.showLoading({ title: '导入中...' });

    try {
      const currentUserId = await resolveCurrentUserId();
      const shareRows = await callDbQuery(
        'SELECT user_id FROM schedule_share_keys WHERE share_key = ? AND is_active = 1 LIMIT 1',
        [shareKey]
      );

      if (!shareRows.length) {
        throw new Error('未找到对应的分享密钥');
      }

      const sourceUserId = Number(shareRows[0].user_id);
      if (sourceUserId === currentUserId) {
        throw new Error('不能导入自己的分享课表');
      }

      const sourceCourses = await callDbQuery(
        `SELECT course_name, teacher AS teacher_name, location AS classroom, weekday, start_section, end_section, start_time, end_time, start_week, end_week
         FROM courses
         WHERE user_id = ?
         ORDER BY weekday ASC, start_section ASC`,
        [sourceUserId]
      );

      if (!sourceCourses.length) {
        throw new Error('这个密钥对应的用户还没有可导入的课表');
      }

      await callDbQuery('DELETE FROM courses WHERE user_id = ?', [currentUserId]);

      const placeholders = sourceCourses.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params = [];

      sourceCourses.forEach((course) => {
        params.push(
          currentUserId,
          course.course_name,
          course.teacher_name || '',
          course.classroom || '',
          Number(course.weekday),
          Number(course.start_section),
          Number(course.end_section),
          course.start_time || null,
          course.end_time || null,
          Number(course.start_week),
          Number(course.end_week)
        );
      });

      await callDbQuery(
        `INSERT INTO courses (
          user_id, course_name, teacher, location,
          weekday, start_section, end_section, start_time, end_time, start_week, end_week
        ) VALUES ${placeholders}`,
        params
      );

      await callDbQuery(
        'UPDATE schedule_share_keys SET last_imported_at = CURRENT_TIMESTAMP WHERE share_key = ?',
        [shareKey]
      ).catch(() => null);

      wx.hideLoading();
      this.setData({
        shareImportLoading: false,
        shareImportKey: ''
      });
      wx.showModal({
        title: '导入成功',
        content: `已通过密钥导入 ${sourceCourses.length} 门课程到你的课表。`,
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/courses/courses' });
        }
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ shareImportLoading: false });
      wx.showToast({
        title: error && error.message ? error.message : '导入失败',
        icon: 'none'
      });
    }
  },

  requireAuth() {
    if (!hasLoginSession() || !getLoginToken()) {
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
      sizeType: ['original'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const tempFileSize = res.tempFiles[0].size;
        this._lastOriginalImagePath = tempFilePath;
        this._usingOriginalRetry = false;
        if (tempFileSize > 1024 * 1024) {
          this.compressImage(tempFilePath);
        } else {
          this.prepareAndUploadImage(tempFilePath, { originalFilePath: tempFilePath });
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
      success: (res) => this.prepareAndUploadImage(res.tempFilePath, { originalFilePath: filePath }),
      fail: () => this.prepareAndUploadImage(filePath, { originalFilePath: filePath })
    });
  },

  prepareAndUploadImage(filePath) {
    this.preprocessImageForOcr(filePath)
      .then((processedPath) => {
        this.uploadImage(processedPath || filePath);
      })
      .catch((error) => {
        console.warn('[Import] 图片预处理失败，回退原图上传:', error);
        this.uploadImage(filePath);
      });
  },

  ensurePreprocessCanvas() {
    if (this._preprocessCanvas) return Promise.resolve(this._preprocessCanvas);

    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#ocr-preprocess-canvas').fields({ node: true, size: true }).exec((res) => {
        const canvasNode = res && res[0] && res[0].node;
        if (!canvasNode) {
          reject(new Error('未找到预处理画布'));
          return;
        }

        const context = canvasNode.getContext('2d');
        const dpr = wx.getWindowInfo ? (wx.getWindowInfo().pixelRatio || 1) : 1;
        this._preprocessCanvas = {
          canvas: canvasNode,
          context,
          dpr
        };
        resolve(this._preprocessCanvas);
      });
    });
  },

  loadCanvasImage(canvas, filePath) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = filePath;
    });
  },

  getImageInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: resolve,
        fail: reject
      });
    });
  },

  canvasToTempFilePath(canvas, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width,
        height,
        destWidth: width,
        destHeight: height,
        fileType: 'jpg',
        quality: 0.92,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      }, this);
    });
  },

  async preprocessImageForOcr(filePath) {
    const [{ width: rawWidth, height: rawHeight }, { canvas, context, dpr }] = await Promise.all([
      this.getImageInfo(filePath),
      this.ensurePreprocessCanvas()
    ]);
    const image = await this.loadCanvasImage(canvas, filePath);

    const scale = Math.min(1, OCR_PREPROCESS_CONFIG.maxEdge / Math.max(rawWidth, rawHeight));
    const drawWidth = Math.max(1, Math.round(rawWidth * scale));
    const drawHeight = Math.max(1, Math.round(rawHeight * scale));

    canvas.width = Math.max(1, Math.floor(drawWidth * dpr));
    canvas.height = Math.max(1, Math.floor(drawHeight * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, drawWidth, drawHeight);
    context.drawImage(image, 0, 0, drawWidth, drawHeight);

    const initialImageData = context.getImageData(0, 0, drawWidth, drawHeight);
    const cropBounds = computeCropBoundsFromImageData(initialImageData, drawWidth, drawHeight);

    const croppedWidth = Math.max(1, cropBounds.width);
    const croppedHeight = Math.max(1, cropBounds.height);

    canvas.width = Math.max(1, Math.floor(croppedWidth * dpr));
    canvas.height = Math.max(1, Math.floor(croppedHeight * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, croppedWidth, croppedHeight);
    context.drawImage(
      image,
      cropBounds.left / scale,
      cropBounds.top / scale,
      cropBounds.width / scale,
      cropBounds.height / scale,
      0,
      0,
      croppedWidth,
      croppedHeight
    );

    const enhancedImageData = enhanceImageDataForOcr(context.getImageData(0, 0, croppedWidth, croppedHeight));
    context.putImageData(enhancedImageData, 0, 0);

    return this.canvasToTempFilePath(canvas, croppedWidth, croppedHeight);
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

  prepareAndUploadImage(filePath, options = {}) {
    const originalFilePath = options.originalFilePath || filePath;
    this.preprocessImageForOcr(filePath)
      .then((processedPath) => {
        this.uploadImageWithOptions(processedPath || filePath, {
          originalFilePath,
          usedPreprocess: true
        });
      })
      .catch((error) => {
        console.warn('[Import] 图片预处理失败，回退原图上传:', error);
        this.uploadImageWithOptions(filePath, {
          originalFilePath,
          usedPreprocess: false
        });
      });
  },

  uploadImageWithOptions(filePath, options = {}) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (!OCR_CONFIG.supportedFormats.includes(ext)) {
      wx.showToast({ title: '不支持的图片格式', icon: 'none' });
      return;
    }

    this._lastOriginalImagePath = options.originalFilePath || this._lastOriginalImagePath || filePath;
    this._lastUploadUsedPreprocess = options.usedPreprocess !== false;

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
      this.fallbackLocalParse(extracted.structured || extracted.plain);

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
    const candidateGroups = [];

    if (this._gridParsedCourses && this._gridParsedCourses.length > 0) {
      candidateGroups.push({ source: 'grid', courses: this._gridParsedCourses });
    }
    if (this._structuredOcrText) {
      const structuredCourses = this.parseStructuredText(this._structuredOcrText);
      if (structuredCourses.length > 0) {
        candidateGroups.push({ source: 'structured', courses: structuredCourses });
      }
    }

    const plainCourses = this.parseScheduleText(this._rawOcrText || ocrText);
    if (plainCourses.length > 0) {
      candidateGroups.push({ source: 'plain', courses: plainCourses });
    }

    if (!candidateGroups.length) {
      this.onParseComplete([], ocrText);
      return;
    }

    const rankedGroups = candidateGroups
      .map((group) => scoreBatchForBase(group.source, group.courses))
      .sort((a, b) => b.score - a.score);

    const baseGroup = rankedGroups[0];
    const otherGroups = rankedGroups.slice(1).map((group) => ({
      source: group.source,
      courses: group.courses
    }));

    const courses = enrichBaseCourses(baseGroup.courses, otherGroups);
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

    const validCourses = normalizeParsedCourses(courses);

    if (
      looksLikeCollapsedWeekdayResult(validCourses) &&
      this._lastUploadUsedPreprocess &&
      this._lastOriginalImagePath &&
      !this._usingOriginalRetry
    ) {
      this._usingOriginalRetry = true;
      wx.showLoading({ title: '检测到星期异常，重试中...' });
      this.uploadImageWithOptions(this._lastOriginalImagePath, {
        originalFilePath: this._lastOriginalImagePath,
        usedPreprocess: false
      });
      return;
    }

    wx.hideLoading();
    this.setData({
      status: 'success',
      recognizedText: ocrText || '(无文字识别结果)',
      parsedCourses: validCourses,
      editorVisible: false,
      editingIndex: -1,
      editorCourse: null
    });

    if (validCourses.length > 0) {
      wx.showToast({ title: `识别到 ${validCourses.length} 门课程`, icon: 'success' });
    } else {
      wx.showToast({ title: '未能解析出课程，请检查图片', icon: 'none', duration: 2500 });
    }
  },

  // ==================== 结构化格式解析（基于空间位置重建） ====================

  onEditCourse(e) {
    const index = Number(e.currentTarget.dataset.index);
    const course = this.data.parsedCourses[index];
    if (!course) return;

    this.setData({
      editorVisible: true,
      editingIndex: index,
      editorCourse: {
        course_name: course.course_name || '',
        teacher_name: course.teacher_name || '',
        classroom: course.classroom || '',
        weekday: Number(course.weekday) || 1,
        start_section: Number(course.start_section) || 1,
        end_section: Number(course.end_section) || 2,
        start_week: Number(course.start_week) || 1,
        end_week: Number(course.end_week) || 16,
      }
    });
  },

  closeCourseEditor() {
    this.setData({
      editorVisible: false,
      editingIndex: -1,
      editorCourse: null
    });
  },

  onEditorTextInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`editorCourse.${field}`]: e.detail.value || ''
    });
  },

  onEditorWeekdayChange(e) {
    this.setData({
      'editorCourse.weekday': Number(e.detail.value) + 1
    });
  },

  onEditorSectionChange(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`editorCourse.${field}`]: Number(e.detail.value) + 1
    });
  },

  onEditorNumberBlur(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`editorCourse.${field}`]: String(e.detail.value || '').trim()
    });
  },

  onDeleteCourse() {
    const index = this.data.editingIndex;
    if (index < 0) return;

    const parsedCourses = (this.data.parsedCourses || []).slice();
    parsedCourses.splice(index, 1);

    this.setData({
      parsedCourses,
      editorVisible: false,
      editingIndex: -1,
      editorCourse: null
    });
    wx.showToast({ title: '已删除这门课', icon: 'success' });
  },

  onSaveCourseEdit() {
    const index = this.data.editingIndex;
    const source = this.data.editorCourse || {};
    if (index < 0) return;

    const course = normalizeParsedCourses([{
      course_name: source.course_name,
      teacher_name: source.teacher_name,
      classroom: source.classroom,
      weekday: source.weekday,
      start_section: source.start_section,
      end_section: source.end_section,
      start_week: source.start_week,
      end_week: source.end_week,
    }])[0];

    if (!course) {
      wx.showToast({ title: '请先填写正确课程名', icon: 'none' });
      return;
    }

    const parsedCourses = (this.data.parsedCourses || []).slice();
    parsedCourses[index] = course;

    this.setData({
      parsedCourses: normalizeParsedCourses(parsedCourses),
      editorVisible: false,
      editingIndex: -1,
      editorCourse: null
    });
    wx.showToast({ title: '课程已更新', icon: 'success' });
  },

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

    const token = getLoginToken();
    if (!token) {
      this.requireAuth();
      return;
    }

    const user = getStoredUser();
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
            updateStoredUser({ id: userId });
            wx.hideLoading();
            this.saveCourses(userId, courses);
          } else {
            clearLoginSession();
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

    const token = getLoginToken() || '';
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
          this.setData({
            status: 'idle',
            savedCount: count,
            parsedCourses: [],
            recognizedText: '',
            editorVisible: false,
            editingIndex: -1,
            editorCourse: null
          });
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
    this.setData({
      status: 'idle',
      errorMsg: '',
      parsedCourses: [],
      recognizedText: '',
      editorVisible: false,
      editingIndex: -1,
      editorCourse: null
    });
  },

  // 底部导航
  goToIndex() { wx.switchTab({ url: '/pages/index/index' }); },
  goToCourses() { wx.switchTab({ url: '/pages/courses/courses' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToImport() { },
  goToProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
});
