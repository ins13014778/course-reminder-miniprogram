const {
  getLoginToken,
  getStoredUser,
  hasLoginSession,
  updateStoredUser,
  clearLoginSession,
} = require('../../utils/auth');

const REPORT_REASONS = ['垃圾广告', '违规引流', '不实内容', '低俗内容', '其他'];

Page({
  data: {
    shareCode: '',
    loading: true,
    unavailable: false,
    unavailableMessage: '',
    currentUserId: null,
    note: null,
    reportVisible: false,
    reportReason: '',
    reportDescription: '',
    reportReasons: REPORT_REASONS,
  },

  onLoad(options) {
    this.setData({
      shareCode: options.shareCode || '',
    });
    this.loadSharedNote();
  },

  onShow() {
    if (this.data.shareCode) {
      this.loadSharedNote();
    }
  },

  onShareAppMessage() {
    const note = this.data.note;
    return {
      title: note ? `${note.nickname || '同学'} 分享了一条课程笔记` : '课程笔记分享',
      path: `/pages/note-share/note-share?shareCode=${encodeURIComponent(this.data.shareCode)}`,
    };
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
      this.setData({ currentUserId: null });
      return null;
    }

    const cachedUser = getStoredUser();
    if (cachedUser.id) {
      this.setData({ currentUserId: cachedUser.id });
      return cachedUser.id;
    }

    const rows = await this.callDbQuery('SELECT id FROM users WHERE openid = ? LIMIT 1', [token]);
    if (!rows.length) {
      clearLoginSession();
      this.setData({ currentUserId: null });
      return null;
    }

    updateStoredUser({ id: rows[0].id });
    this.setData({ currentUserId: rows[0].id });
    return rows[0].id;
  },

  formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  async loadSharedNote() {
    this.setData({ loading: true, unavailable: false, unavailableMessage: '' });

    try {
      const currentUserId = await this.ensureUserId();
      const rows = await this.callDbQuery(
        `SELECT
            ns.id AS share_id,
            ns.share_code,
            ns.status AS share_status,
            ns.view_count,
            ns.last_viewed_at,
            ns.ban_reason,
            n.id AS note_id,
            n.user_id,
            n.content,
            n.image_url,
            n.status AS note_status,
            n.moderation_reason,
            n.created_at,
            n.updated_at,
            u.nickname,
            u.avatar_url,
            u.school
         FROM note_shares ns
         LEFT JOIN notes n ON n.id = ns.note_id
         LEFT JOIN users u ON u.id = n.user_id
         WHERE ns.share_code = ?
         LIMIT 1`,
        [this.data.shareCode],
      );

      if (!rows.length) {
        this.setData({
          loading: false,
          unavailable: true,
          unavailableMessage: '这个分享不存在，可能已经失效。',
          note: null,
        });
        return;
      }

      const row = rows[0];
      const isOwner = Number(currentUserId) === Number(row.user_id);

      if (row.share_status !== 'active') {
        this.setData({
          loading: false,
          unavailable: true,
          unavailableMessage: row.ban_reason || '这个分享已经停用。',
          note: {
            ...row,
            isOwner,
          },
        });
        return;
      }

      if (row.note_status !== 'visible') {
        this.setData({
          loading: false,
          unavailable: true,
          unavailableMessage: row.moderation_reason || '原笔记暂时不可查看。',
          note: {
            ...row,
            isOwner,
          },
        });
        return;
      }

      if (!isOwner) {
        await this.callDbQuery(
          `UPDATE note_shares
              SET view_count = view_count + 1,
                  last_viewed_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [row.share_id],
        );
      }

      this.setData({
        loading: false,
        note: {
          shareId: row.share_id,
          shareCode: row.share_code,
          userId: row.user_id,
          content: row.content || '',
          imageUrl: row.image_url || '',
          nickname: row.nickname || '同学',
          avatarUrl: row.avatar_url || '',
          avatarLetter: (row.nickname || '课').trim().charAt(0) || '课',
          school: row.school || '',
          updatedAt: this.formatDateTime(row.updated_at || row.created_at),
          viewCount: Number(row.view_count || 0) + (isOwner ? 0 : 1),
          isOwner,
        },
      });
    } catch (error) {
      this.setData({
        loading: false,
        unavailable: true,
        unavailableMessage: (error && error.message) || '加载分享失败',
      });
    }
  },

  requireLoginAction() {
    if (this.data.currentUserId) return true;
    wx.showModal({
      title: '请先登录',
      content: '举报内容需要先登录，现在去登录吗？',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      },
    });
    return false;
  },

  openReportDialog() {
    if (!this.requireLoginAction()) return;
    if (!this.data.note || this.data.note.isOwner) return;

    this.setData({
      reportVisible: true,
      reportReason: '',
      reportDescription: '',
    });
  },

  closeReportDialog() {
    this.setData({ reportVisible: false });
  },

  noop() {},

  chooseReason(e) {
    this.setData({ reportReason: e.currentTarget.dataset.reason });
  },

  onReportDescriptionInput(e) {
    this.setData({ reportDescription: e.detail.value });
  },

  async submitReport() {
    if (!this.requireLoginAction()) return;
    if (!this.data.note || this.data.note.isOwner) return;

    const reason = String(this.data.reportReason || '').trim();
    const description = String(this.data.reportDescription || '').trim();
    if (!reason) {
      wx.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }

    try {
      const exists = await this.callDbQuery(
        `SELECT id
           FROM content_reports
          WHERE reporter_user_id = ?
            AND target_type = 'note_share'
            AND target_id = ?
            AND status = 'pending'
          LIMIT 1`,
        [this.data.currentUserId, this.data.note.shareId],
      );

      if (exists.length) {
        wx.showToast({ title: '你已经举报过了，请等待处理', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '提交举报中...' });
      await this.callDbQuery(
        `INSERT INTO content_reports
          (reporter_user_id, reported_user_id, target_type, target_id, reason, description, status)
         VALUES (?, ?, 'note_share', ?, ?, ?, 'pending')`,
        [
          this.data.currentUserId,
          this.data.note.userId,
          this.data.note.shareId,
          reason,
          description,
        ],
      );
      wx.hideLoading();
      this.setData({ reportVisible: false });
      wx.showToast({ title: '举报已提交', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: (error && error.message) || '举报失败', icon: 'none' });
    }
  },

  disableShare() {
    if (!this.data.note || !this.data.note.isOwner) return;

    wx.showModal({
      title: '停用分享',
      content: '停用后，其他人再打开这条分享将无法看到笔记内容。',
      confirmColor: '#d25c2f',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          wx.showLoading({ title: '停用中...' });
          await this.callDbQuery(
            `UPDATE note_shares
                SET status = 'blocked',
                    ban_reason = '用户主动关闭分享',
                    banned_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
            [this.data.note.shareId],
          );
          wx.hideLoading();
          wx.showToast({ title: '分享已停用', icon: 'success' });
          this.loadSharedNote();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: (error && error.message) || '停用失败', icon: 'none' });
        }
      },
    });
  },
});
