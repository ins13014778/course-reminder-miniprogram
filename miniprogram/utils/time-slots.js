const SECTION_TIME_MAP = {
  1: ['08:30', '09:15'],
  2: ['09:25', '10:10'],
  3: ['10:25', '11:10'],
  4: ['11:20', '12:05'],
  5: ['14:00', '14:45'],
  6: ['14:55', '15:40'],
  7: ['16:00', '16:45'],
  8: ['16:55', '17:40'],
  9: ['19:00', '19:45'],
  10: ['19:45', '20:30']
};

const TIME_SLOT_GROUPS = [
  {
    key: 'morning',
    label: '上午',
    slots: [
      { start: 1, end: 2, label: '第1-2节', time: '08:30-10:10' },
      { start: 3, end: 4, label: '第3-4节', time: '10:25-12:05' }
    ]
  },
  {
    key: 'afternoon',
    label: '下午',
    slots: [
      { start: 5, end: 6, label: '第5-6节', time: '14:00-15:40' },
      { start: 7, end: 8, label: '第7-8节', time: '16:00-17:40' }
    ]
  },
  {
    key: 'evening',
    label: '晚上',
    slots: [
      { start: 9, end: 10, label: '晚自习', time: '19:00-20:30' }
    ]
  }
];

function getSectionTime(section, isStart) {
  const time = SECTION_TIME_MAP[section];
  if (!time) {
    return isStart ? '08:30' : '09:15';
  }

  return isStart ? time[0] : time[1];
}

module.exports = {
  SECTION_TIME_MAP,
  TIME_SLOT_GROUPS,
  getSectionTime
};
