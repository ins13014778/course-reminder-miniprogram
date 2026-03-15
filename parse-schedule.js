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
}));

// 识别星期标题
const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const weekdayHeaders = [];
weekdays.forEach((day, idx) => {
  const found = texts.find(t => t.text === day);
  if (found) {
    weekdayHeaders.push({ day, dayIndex: idx + 1, x: found.x, width: found.width });
  }
});
weekdayHeaders.sort((a, b) => a.x - b.x);

// 识别节次
const sections = [];
for (let i = 1; i <= 10; i++) {
  const found = texts.find(t => t.text === String(i) && t.width < 30);
  if (found) {
    sections.push({ section: i, y: found.y, height: found.height });
  }
}
sections.sort((a, b) => a.y - b.y);

// 构建课程表网格
const schedule = {};
weekdayHeaders.forEach(header => {
  schedule[header.dayIndex] = {};
});

// 分配文本到单元格
texts.forEach(t => {
  // 跳过标题行和节次列
  if (weekdays.includes(t.text) || /^[1-9]0?$/.test(t.text)) return;
  if (t.text.includes('学期') || t.text.includes('班课表')) return;
  if (t.text === '时间段' || t.text === '节次' || t.text === '上午' || t.text === '下午' || t.text === '晚上') return;

  // 找到对应的星期列
  let weekdayCol = null;
  for (let i = 0; i < weekdayHeaders.length; i++) {
    const curr = weekdayHeaders[i];
    const next = weekdayHeaders[i + 1];
    if (next) {
      if (t.x >= curr.x && t.x < next.x) {
        weekdayCol = curr.dayIndex;
        break;
      }
    } else {
      if (t.x >= curr.x) {
        weekdayCol = curr.dayIndex;
        break;
      }
    }
  }

  if (!weekdayCol) return;

  // 找到对应的节次行
  let sectionRow = null;
  for (let i = 0; i < sections.length; i++) {
    const curr = sections[i];
    const next = sections[i + 1];
    if (next) {
      if (t.y >= curr.y && t.y < next.y) {
        sectionRow = curr.section;
        break;
      }
    } else {
      if (t.y >= curr.y) {
        sectionRow = curr.section;
        break;
      }
    }
  }

  if (!sectionRow) return;

  // 添加到对应单元格
  if (!schedule[weekdayCol][sectionRow]) {
    schedule[weekdayCol][sectionRow] = [];
  }
  schedule[weekdayCol][sectionRow].push(t.text);
});

// 合并课程信息
const courses = [];
for (let day = 1; day <= 7; day++) {
  if (!schedule[day]) continue;

  for (let section = 1; section <= 10; section++) {
    if (!schedule[day][section] || schedule[day][section].length === 0) continue;

    const content = schedule[day][section].join(' ');

    // 提取节次范围
    const sectionMatch = content.match(/\((\d+)-(\d+)节\)/);
    if (sectionMatch) {
      const startSection = parseInt(sectionMatch[1]);
      const endSection = parseInt(sectionMatch[2]);

      // 提取课程名（节次标记之前的内容）
      const courseName = content.substring(0, content.indexOf('(')).trim();

      // 提取周次
      const weekMatch = content.match(/(\d+)-(\d+)周/);
      const startWeek = weekMatch ? parseInt(weekMatch[1]) : 1;
      const endWeek = weekMatch ? parseInt(weekMatch[2]) : 18;

      // 提取地点
      const locationMatch = content.match(/校区\s*([^/]+)/);
      const location = locationMatch ? locationMatch[1].trim() : '';

      // 提取教师
      const teacherMatch = content.match(/\/([^/]+)\/总学时/);
      const teacher = teacherMatch ? teacherMatch[1].trim() : '';

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
}

// 输出格式化结果
console.log('=== 课程表解析结果 ===\n');
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
fs.writeFileSync('./parsed-schedule.json', JSON.stringify(schedule, null, 2), 'utf-8');
console.log('\n\n已保存到 parsed-schedule.json');
