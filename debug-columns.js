const fs = require('fs');

// 读取OCR数据
const ocrData = JSON.parse(fs.readFileSync('./课表数据', 'utf-8'));
const textElements = ocrData.data[0].result[0].elements.text;

// 提取所有文本及坐标
const texts = textElements.map(t => ({
  text: t.text,
  x: t.x,
  y: t.y
})).sort((a, b) => a.y - b.y || a.x - b.x);

// 识别星期标题
const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const weekdayHeaders = weekdays.map((day, idx) => {
  const found = texts.find(t => t.text === day);
  return found ? { day, dayIndex: idx + 1, x: found.x } : null;
}).filter(Boolean).sort((a, b) => a.x - b.x);

console.log('=== 星期标题位置 ===');
weekdayHeaders.forEach(h => {
  console.log(`${h.day} (dayIndex=${h.dayIndex}): x=${h.x}`);
});

// 定义列边界（使用相邻标题的中点作为分界）
const columnBoundaries = [];
for (let i = 0; i < weekdayHeaders.length; i++) {
  const curr = weekdayHeaders[i];
  const prev = weekdayHeaders[i - 1];
  const next = weekdayHeaders[i + 1];
  columnBoundaries.push({
    dayIndex: curr.dayIndex,
    day: curr.day,
    xStart: prev ? Math.floor((prev.x + curr.x) / 2) : 0,
    xEnd: next ? Math.floor((curr.x + next.x) / 2) : 9999
  });
}

console.log('\n=== 列边界 ===');
columnBoundaries.forEach(col => {
  console.log(`${col.day} (dayIndex=${col.dayIndex}): x范围 [${col.xStart}, ${col.xEnd})`);
});

// 找一些课程文本，看它们被分配到哪一列
const courseTexts = [
  '大学生心理健康教育',
  '计算机视觉应用开发',
  '创新创业教育',
  '大学英语',
  '思想道德与法治'
];

console.log('\n=== 课程文本位置 ===');
courseTexts.forEach(courseName => {
  const found = texts.find(t => t.text.includes(courseName.substring(0, 4)));
  if (found) {
    const col = columnBoundaries.find(c => found.x >= c.xStart && found.x < c.xEnd);
    console.log(`"${found.text}" (x=${found.x}) -> ${col ? col.day : '未分配'}`);
  }
});
