const tcb = require('@cloudbase/node-sdk');
const app = tcb.init({ env: 'dawdawd15-8g023nsw8cb3f68a' });

const SYSTEM_PROMPT = `你是一个课程表解析专家。用户会给你 OCR 识别出的课程表文本。
文本可能是**结构化格式**或**纯文本格式**。

## 结构化格式说明
如果输入包含 [星期X 第N-M节] 标记，则已按表格单元格分组：
- [星期二 第1-2节] 表示该单元格位于星期二、第1-2节
- 标记下方的文本属于该单元格（课程名、地点、教师等）
- **优先使用标记中的星期和节次信息**，而非OCR文本中可能错误的 "(2-2节)" 等

## 输出要求
- 直接返回 JSON 数组，不要包含任何其他文字、解释或 markdown 标记
- 每个元素格式：
  {
    "course_name": "课程名称",
    "teacher": "教师姓名",
    "location": "上课地点",
    "weekday": 1,
    "start_section": 1,
    "end_section": 2,
    "start_week": 1,
    "end_week": 18
  }

## 解析规则
1. weekday: 1=星期一, 2=星期二, ..., 7=星期日
2. start_section / end_section: 节次数字（如 "3-4节" → start_section:3, end_section:4）
3. start_week / end_week: 周次范围（如 "1-18周" → 1, 18）
4. 修正 OCR 常见错误：
   - 小写字母 "l" 误识别为数字 "1"（如 "l#多媒体教室" → "1#多媒体教室"）
   - 缺少小数点（"学分:20" 实为 "2.0"，"学分:40" 实为 "4.0"）
   - "(2-2节)" 这种不合理的节次范围，应根据标记修正为 "(1-2节)"
5. OCR断行拼接：文本可能在行尾/行首断开，如 "象湖校区人" + "工智能综合应用实训室1/万" + "志强" → 地点="人工智能综合应用实训室1"，教师="万志强"
6. 忽略以下内容：学分/学时信息、专业/年级信息、打印时间、表头
7. "未排地点" 或 "未排" 统一填 "待定"
8. 从 "地点/教师/总学时" 格式中正确提取地点和教师
9. 同一门课如果出现在多个时间段，每个时间段输出一条记录
10. 课程名后的 "(2)" 是课程版本号，不是节次，保留在课程名中（如 "大学英语(2)"）或去掉均可，但不要误解为节次`;

exports.main = async (event, context) => {
  const { ocrText } = event;

  if (!ocrText || ocrText.trim().length < 10) {
    return { success: false, error: '缺少 OCR 文本或文本过短' };
  }

  try {
    const ai = app.ai();
    const model = ai.createModel('deepseek');

    const result = await model.generateText({
      model: 'deepseek-v3.2',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: ocrText }
      ],
      temperature: 0.1
    });

    // 提取 JSON（处理可能的 markdown 代码块包裹）
    let jsonStr = result.text.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim();

    const courses = JSON.parse(jsonStr);

    if (!Array.isArray(courses)) {
      return { success: false, error: '解析结果不是数组', raw: result.text };
    }

    // 基础校验和清洗
    const validCourses = courses
      .filter(c => c.course_name && c.course_name.length >= 2 && c.weekday >= 1 && c.weekday <= 7)
      .map(c => ({
        course_name: String(c.course_name).trim(),
        teacher: String(c.teacher || '').trim(),
        location: String(c.location || '待定').trim(),
        weekday: parseInt(c.weekday) || 1,
        start_section: parseInt(c.start_section) || 1,
        end_section: parseInt(c.end_section) || 2,
        start_week: parseInt(c.start_week) || 1,
        end_week: parseInt(c.end_week) || 18,
      }));

    return { success: true, courses: validCourses };
  } catch (e) {
    console.error('[parse-schedule] 错误:', e);
    return { success: false, error: e.message || '解析失败' };
  }
};
