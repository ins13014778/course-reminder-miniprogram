const fs = require('fs');

// 读取OCR数据
const ocrData = JSON.parse(fs.readFileSync('./课表数据', 'utf-8'));
const textElements = ocrData.data[0].result[0].elements.text;

// 提取所有文本及坐标
const texts = textElements.map(t => ({
  text: t.text,
  x: t.x,
  y: t.y,
  width: t.width,
  height: t.height
})).sort((a, b) => a.y - b.y || a.x - b.x);

// 识别星期标题（按x坐标排序）
const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const weekdayHeaders = weekdays.map((day, idx) => {
  const found = texts.find(t => t.text === day);
  return found ? { day, dayIndex: idx + 1, x: found.x, width: found.width } : null;
}).filter(Boolean).sort((a, b) => a.x - b.x);

console.log('识别到的星期列:', weekdayHeaders.map(h => `${h.day}(x=${h.x})`).join(', '));

// 识别节次行（按y坐标排序）
const sections = [];
for (let i = 1; i <= 10; i++) {
  const found = texts.find(t => t.text === String(i) && t.width < 30 && t.height < 30);
  if (found) {
    sections.push({ section: i, y: found.y, height: found.height });
  }
}
sections.sort((a, b) => a.y - b.y);

console.log('识别到的节次行:', sections.map(s => `第${s.section}节(y=${s.y})`).join(', '));
console.log('\n');

// 定义列边界
const columnBoundaries = [];
for (let i = 0; i < weekdayHeaders.length; i++) {
  const curr = weekdayHeaders[i];
  const next = weekdayHeaders[i + 1];
  columnBoundaries.push({
    dayIndex: curr.dayIndex,
    day: curr.day,
    xStart: curr.x - 50,
    xEnd: next ? next.x - 50 : 9999
  });
}

// 定义行边界（每2节为一个单元格）
const rowBoundaries = [];
for (let i = 0; i < sections.length; i += 2) {
  const curr = sections[i];
  const next = sections[i + 2];
  rowBoundaries.push({
    startSection: curr.section,
    endSection: sections[i + 1] ? sections[i + 1].section : curr.section,
    yStart: curr.y - 20,
    yEnd: next ? next.y - 20 : 9999
  });
}

// 构建课程表网格
const schedule = {};
columnBoundaries.forEach(col => {
  schedule[col.dayIndex] = {};
  rowBoundaries.forEach(row => {
    schedule[col.dayIndex][row.startSection] = [];
  });
});

// 分配文本到单元格
texts.forEach(t => {
  // 跳过标题和标签
  if (weekdays.includes(t.text)) return;
  if (/^[1-9]0?$/.test(t.text) && t.width < 30) return;
  if (t.text.includes('学期') || t.text.includes('班课表') || t.text.includes('专业')) return;
  if (['时间段', '节次', '上午', '下午', '晚上', '讲课', '实验', '实践', '上机'].includes(t.text)) return;
  if (t.text.includes('打印时间')) return;

  // 找到对应的列
  const col = columnBoundaries.find(c => t.x >= c.xStart && t.x < c.xEnd);
  if (!col) return;

  // 找到对应的行
  const row = rowBoundaries.find(r => t.y >= r.yStart && t.y < r.yEnd);
  if (!row) return;

  // 添加到对应单元格
  schedule[col.dayIndex][row.startSection].push(t.text);
});

// 解析课程信息
const courses = [];
for (let day = 1; day <= 7; day++) {
  if (!schedule[day]) continue;

  for (let section = 1; section <= 10; section += 2) {
    const cellTexts = schedule[day][section];
    if (!cellTexts || cellTexts.length === 0) continue;

    const fullText = cellTexts.join(' ');

    // 提取课程名（第一行，通常是最大的文本）
    let courseName = cellTexts[0] || '';

    // 提取节次范围
    const sectionMatch = fullText.match(/\((\d+)-(\d+)节\)/);
    const startSection = sectionMatch ? parseInt(sectionMatch[1]) : section;
    const endSection = sectionMatch ? parseInt(sectionMatch[2]) : section + 1;

    // 提取周次
    const weekMatch = fullText.match(/(\d+)-(\d+)周/);
    const startWeek = weekMatch ? parseInt(weekMatch[1]) : 1;
    const endWeek = weekMatch ? parseInt(weekMatch[2]) : 18;

    // 提取地点（校区后面的内容）
    let location = '';
    const locationMatch = fullText.match(/象湖校区\s*([^/]+)/);
    if (locationMatch) {
      location = locationMatch[1].trim().replace(/\s+/g, '');
    }

    // 提取教师
    let teacher = '';
    const teacherMatch = fullText.match(/\/([^/]+)\/总学时/);
    if (teacherMatch) {
      teacher = teacherMatch[1].trim();
    }

    courses.push({
      weekday: day,
      courseName,
      startSection,
      endSection,
      startWeek,
      endWeek,
      location,
      teacher
    });
  }
}

// 输出结果
console.log('=== 解析结果 ===\n');
courses.forEach(c => {
  const dayName = weekdays[c.weekday - 1];
  console.log(`[${dayName} 第${c.startSection}-${c.endSection}节]`);
  console.log(`  课程: ${c.courseName}`);
  console.log(`  教师: ${c.teacher || '未知'}`);
  console.log(`  地点: ${c.location || '待定'}`);
  console.log(`  周次: ${c.startWeek}-${c.endWeek}周`);
  console.log('');
});

// 保存为JSON
fs.writeFileSync('./parsed-schedule.json', JSON.stringify(courses, null, 2), 'utf-8');
console.log('已保存到 parsed-schedule.json');
