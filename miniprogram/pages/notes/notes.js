const { getLoginToken, getStoredUser, hasLoginSession, updateStoredUser, clearLoginSession } = require('../../utils/auth');

Page({
  data: {
    isLoggedIn: false,
    loading: false,
    currentUserId: null,
    notes: [],
    editorVisible: false,
    editorMode: 'add',
    editorTitle: '发布笔记',
    editorForm: {
      id: null,
      content: '',
      imageUrl: '',
    },
  },

  onLoad() {
    this.loadNotes();
  },

  onShow() {
    this.loadNotes();
  },

  callDbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'db-query',
        data: { sql, params },
        success: (res) => {
          const result = res.result;
          if (result && result.success) {
            resolve(result.data || []);
            return;
          }
          reject(new Error((result && result.message) || '数据库操作失败'));
        },
        fail: reject,
      });
    });
  },

  async ensureUserId() {
    const token = getLoginToken();
    if (!hasLoginSession() || !token) {
      this.setData({ isLoggedIn: false, currentUserId: null });
      return null;
    }

    const cachedUser = getStoredUser();
    if (cachedUser.id) {
      this.setData({ isLoggedIn: true, currentUserId: cachedUser.id });
      return cachedUser.id;
    }

    const rows = await this.callDbQuery('SELECT id FROM users WHERE openid = ? LIMIT 1', [token]);
    if (!rows.length) {
      clearLoginSession();
      this.setData({ isLoggedIn: false, currentUserId: null });
      return null;
    }

    updateStoredUser({ id: rows[0].id });
    this.setData({ isLoggedIn: true, currentUserId: rows[0].id });
    return rows[0].id;
  },

  async loadNotes() {
    this.setData({ loading: true });
    try {
      const currentUserId = await this.ensureUserId();
      if (!currentUserId) {
        this.setData({ notes: [], loading: false });
        return;
      }

      const rows = await this.callDbQuery(
        `SELECT
            n.id,
            n.user_id,
            n.content,
            n.image_url,
            n.created_at,
            n.updated_at,
            u.nickname,
            u.avatar_url
         FROM notes n
         LEFT JOIN users u ON u.id = n.user_id
         WHERE n.user_id = ?
           AND n.status = 'visible'
         ORDER BY n.updated_at DESC, n.id DESC`,
        [currentUserId],
      );

      const notes = rows.map((item) => ({
        id: item.id,
        userId: item.user_id,
        content: item.content || '',
        imageUrl: item.image_url || '',
        nickname: item.nickname || '同学',
        avatarUrl: item.avatar_url || '',
        avatarLetter: (item.nickname || '我').trim().charAt(0) || '我',
        updatedAt: this.formatDateTime(item.updated_at || item.created_at),
        isMine: Number(currentUserId) === Number(item.user_id),
      }));

      this.setData({ notes, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: (error && error.message) || '加载笔记失败', icon: 'none' });
    }
  },

  formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  requireLoginAction() {
    if (this.data.isLoggedIn) return true;
    wx.showModal({
      title: '请先登录',
      content: '发布和管理笔记需要先登录，是否现在去登录？',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      },
    });
    return false;
  },

  openAddEditor() {
    if (!this.requireLoginAction()) return;
    this.setData({
      editorVisible: true,
      editorMode: 'add',
      editorTitle: '发布笔记',
      editorForm: {
        id: null,
        content: '',
        imageUrl: '',
      },
    });
  },

  openEditEditor(e) {
    if (!this.requireLoginAction()) return;
    const note = e.currentTarget.dataset.note;
    if (!note || !note.isMine) return;
    this.setData({
      editorVisible: true,
      editorMode: 'edit',
      editorTitle: '编辑笔记',
      editorForm: {
        id: note.id,
        content: note.content,
        imageUrl: note.imageUrl || '',
      },
    });
  },

  closeEditor() {
    this.setData({ editorVisible: false });
  },

  noop() {},

  onContentInput(e) {
    this.setData({ 'editorForm.content': e.detail.value });
  },

  async chooseImage() {
    if (!this.requireLoginAction()) return;

    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      });
      const tempFilePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (!tempFilePath) return;

      wx.showLoading({ title: '上传图片中...' });
      const ext = tempFilePath.split('.').pop() || 'png';
      const cloudPath = `notes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      });
      wx.hideLoading();
      this.setData({ 'editorForm.imageUrl': uploadRes.fileID });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    }
  },

  removeImage() {
    this.setData({ 'editorForm.imageUrl': '' });
  },

  async saveNote() {
    if (!this.requireLoginAction()) return;

    const content = String(this.data.editorForm.content || '').trim();
    const imageUrl = this.data.editorForm.imageUrl || '';
    if (!content) {
      wx.showToast({ title: '请输入笔记内容', icon: 'none' });
      return;
    }

    try {
      const userId = await this.ensureUserId();
      if (!userId) {
        wx.showToast({ title: '未找到用户信息', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '保存中...' });
      if (this.data.editorMode === 'edit' && this.data.editorForm.id) {
        await this.callDbQuery(
          'UPDATE notes SET content = ?, image_url = ? WHERE id = ? AND user_id = ?',
          [content, imageUrl, this.data.editorForm.id, userId],
        );
      } else {
        await this.callDbQuery(
          'INSERT INTO notes (user_id, content, image_url, status) VALUES (?, ?, ?, ?)',
          [userId, content, imageUrl, 'visible'],
        );
      }
      wx.hideLoading();
      this.setData({ editorVisible: false });
      wx.showToast({ title: '笔记已保存', icon: 'success' });
      this.loadNotes();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: (error && error.message) || '保存笔记失败', icon: 'none' });
    }
  },

  onDeleteNote(e) {
    if (!this.requireLoginAction()) return;
    const noteId = e.currentTarget.dataset.id;
    const note = this.data.notes.find((item) => String(item.id) === String(noteId));
    if (!note || !note.isMine) return;

    wx.showModal({
      title: '删除笔记',
      content: '确定要删除这条笔记吗？',
      confirmColor: '#d25c2f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中...' });
          await this.callDbQuery('DELETE FROM notes WHERE id = ? AND user_id = ?', [
            note.id,
            this.data.currentUserId,
          ]);
          wx.hideLoading();
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadNotes();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: (error && error.message) || '删除失败', icon: 'none' });
        }
      },
    });
  },
});
