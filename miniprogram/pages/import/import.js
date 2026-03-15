const config = require('../../config/index');

// OCR API配置
const OCR_CONFIG = {
  baseUrl: 'https://api.scnet.cn/api/llm/v1',
  recognizeEndpoint: '/ocr/recognize',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  defaultApiKey: 'sk-NjEwLTExMTk0NDQzMzA3LTE3NzMzMTM3MjA5NTM=',
};

// OCR类型枚举
const OcrType = {
  GENERAL: 'GENERAL',           // 通用文字识别
  ID_CARD: 'ID_CARD',           // 身份证
  BANK_CARD: 'BANK_CARD',       // 银行卡
  BUSINESS_LICENSE: 'BUSINESS_LICENSE', // 营业执照
  VAT_INVOICE: 'VAT_INVOICE',   // 增值税发票
  TRAIN_TICKET: 'TRAIN_TICKET', // 火车票
};

Page({
  data: {
    status: 'idle',
    taskId: null,
    ocrType: 'GENERAL', // 默认通用识别
    recognizedText: '',  // 识别结果文本
    errorMsg: '',        // 错误信息
    // OCR类型列表
    ocrTypes: [
      { type: 'GENERAL', name: '通用文字识别' },
      { type: 'ID_CARD', name: '身份证' },
      { type: 'BANK_CARD', name: '银行卡' },
      { type: 'BUSINESS_LICENSE', name: '营业执照' },
      { type: 'VAT_INVOICE', name: '增值税发票' },
      { type: 'TRAIN_TICKET', name: '火车票' },
    ],
    ocrTypeIndex: 0,
    currentOcrTypeName: '通用文字识别',
  },

  // 获取API Key
  getApiKey() {
    const storedKey = wx.getStorageSync('ocr_api_key') || wx.getStorageSync('token');
    return storedKey || OCR_CONFIG.defaultApiKey;
  },

  // 设置API Key
  setApiKey(key) {
    wx.setStorageSync('ocr_api_key', key);
  },

  // 验证图片
  validateImage(filePath) {
    // 检查文件扩展名
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (!OCR_CONFIG.supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: `不支持的图片格式: ${ext}`
      };
    }

    // 检查文件大小
    try {
      const fileInfo = wx.getFileSystemManager().statSync(filePath);
      if (fileInfo.size > OCR_CONFIG.maxFileSize) {
        return {
          valid: false,
          error: `图片大小超过10MB限制`
        };
      }
    } catch (e) {
      return {
        valid: false,
        error: '无法获取图片文件信息'
      };
    }

    return { valid: true };
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'], // 压缩图片
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const tempFileSize = res.tempFiles[0].size;

        console.log('选择图片:', tempFilePath, '大小:', tempFileSize);

        // 如果图片大于1MB，先压缩
        if (tempFileSize > 1024 * 1024) {
          this.compressImage(tempFilePath);
        } else {
          this.uploadImage(tempFilePath);
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 压缩图片
  compressImage(filePath) {
    console.log('开始压缩图片...');
    wx.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => {
        console.log('压缩成功:', res.tempFilePath);
        this.uploadImage(res.tempFilePath);
      },
      fail: (err) => {
        console.error('压缩失败，使用原图:', err);
        this.uploadImage(filePath);
      }
    });
  },

  uploadImage(filePath) {
    // 验证图片
    const validation = this.validateImage(filePath);
    if (!validation.valid) {
      wx.showToast({ title: validation.error, icon: 'none' });
      return;
    }

    // 检查API Key
    const apiKey = this.getApiKey();
    if (!apiKey) {
      wx.showModal({
        title: '提示',
        content: '请先配置API Key',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/settings/settings' });
          }
        }
      });
      return;
    }

    console.log('=== 开始上传 ===');
    console.log('文件路径:', filePath);
    console.log('OCR类型:', this.data.ocrType);
    console.log('API Key:', apiKey ? '已配置' : '未配置');
    console.log('请求URL:', `${OCR_CONFIG.baseUrl}${OCR_CONFIG.recognizeEndpoint}`);

    this.setData({ status: 'uploading', errorMsg: '' });

    // 方式1: 使用uploadFile
    wx.uploadFile({
      url: `${OCR_CONFIG.baseUrl}${OCR_CONFIG.recognizeEndpoint}`,
      filePath,
      name: 'file',
      formData: {
        ocrType: this.data.ocrType
      },
      header: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000, // 120秒超时
      success: (res) => {
        this.handleResponse(res);
      },
      fail: (err) => {
        console.error('uploadFile失败，尝试base64方式:', err);

        // 方式2: 转base64用request发送
        this.uploadWithBase64(filePath, apiKey);
      }
    });
  },

  // 使用base64方式上传 - 构造multipart/form-data
  uploadWithBase64(filePath, apiKey) {
    console.log('=== 使用base64方式上传 ===');
    console.log('OCR类型:', this.data.ocrType);

    const fs = wx.getFileSystemManager();
    const ocrType = this.data.ocrType;

    // 读取文件为ArrayBuffer
    fs.readFile({
      filePath,
      success: (res) => {
        const arrayBuffer = res.data;
        const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        console.log('文件大小:', arrayBuffer.byteLength);

        // 构造multipart/form-data
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
        const footer = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="ocrType"\r\n\r\n${ocrType}\r\n--${boundary}--`;

        // 合并数据
        const headerBuffer = new TextEncoder().encode(header);
        const footerBuffer = new TextEncoder().encode(footer);
        const totalLength = headerBuffer.length + arrayBuffer.byteLength + footerBuffer.length;
        const formData = new ArrayBuffer(totalLength);
        const formDataView = new Uint8Array(formData);

        formDataView.set(headerBuffer, 0);
        formDataView.set(new Uint8Array(arrayBuffer), headerBuffer.length);
        formDataView.set(footerBuffer, headerBuffer.length + arrayBuffer.byteLength);

        console.log('发送multipart请求...');

        wx.request({
          url: `${OCR_CONFIG.baseUrl}${OCR_CONFIG.recognizeEndpoint}`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          data: formData,
          timeout: 120000,
          success: (response) => {
            console.log('multipart请求成功:', response);
            this.handleResponse({
              statusCode: response.statusCode,
              data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
            });
          },
          fail: (err) => {
            console.error('multipart请求失败:', err);
            this.setData({
              status: 'failed',
              errorMsg: '上传失败: ' + (err.errMsg || '网络错误')
            });
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        console.error('读取文件失败:', err);
        this.setData({
          status: 'failed',
          errorMsg: '读取文件失败'
        });
        wx.showToast({ title: '读取文件失败', icon: 'none' });
      }
    });
  },

  // 处理响应
  handleResponse(res) {
    console.log('=== OCR响应详情 ===');
    console.log('HTTP状态码:', res.statusCode);
    console.log('响应数据:', res.data);

    try {
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      console.log('解析后数据:', JSON.stringify(data, null, 2));

      // 检查是否有error字段
      if (data.error) {
        const errorMsg = data.error.message || '识别失败';
        console.error('API错误:', data.error);
        this.setData({ status: 'failed', errorMsg: `${errorMsg}` });
        wx.showToast({ title: errorMsg, icon: 'none' });
        return;
      }

      // 兼容多种成功码格式
      const successCodes = ['0', '200', 0, 200, 'success'];
      if (successCodes.includes(data.code) || data.code === undefined) {
        // 识别成功
        const results = [];
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(item => {
            if (item.result && Array.isArray(item.result)) {
              results.push(...item.result);
            }
          });
        }

        // 提取识别文本
        let text = '';
        results.forEach(result => {
          if (result.elements && result.elements.text) {
            result.elements.text.forEach(t => {
              text += t.text + '\n';
            });
          }
        });

        this.setData({
          status: 'success',
          recognizedText: text || '识别成功'
        });

        console.log('识别结果:', results);
        wx.showToast({ title: '识别成功', icon: 'success' });
      } else {
        // 识别失败 - 显示详细信息
        const errorMsg = this.getErrorMessage(data.code, data.msg);
        console.error('识别失败 - code:', data.code, 'msg:', data.msg);
        this.setData({ status: 'failed', errorMsg: `${errorMsg} (错误码: ${data.code})` });
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    } catch (e) {
      console.error('解析响应失败:', e);
      console.error('原始响应:', res.data);
      this.setData({ status: 'failed', errorMsg: '响应解析失败: ' + e.message });
      wx.showToast({ title: '响应解析失败', icon: 'none' });
    }
  },

  // 测试网络连通性
  testNetwork() {
    console.log('=== 测试网络连通性 ===');
    wx.request({
      url: 'https://api.scnet.cn/api/llm/v1/ocr/recognize',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      data: {},
      success: (res) => {
        console.log('网络测试成功:', res);
        wx.showModal({
          title: '网络测试',
          content: 'API可访问，返回: ' + JSON.stringify(res.data).substring(0, 100),
          showCancel: false
        });
      },
      fail: (err) => {
        console.error('网络测试失败:', err);
        wx.showModal({
          title: '网络测试失败',
          content: '无法访问API，请检查:\n1. 是否关闭了域名校验\n2. 网络是否正常\n错误: ' + err.errMsg,
          showCancel: false
        });
      }
    });
  },

  // 获取错误信息
  getErrorMessage(code, msg) {
    const errorMap = {
      '400': '请求格式错误',
      '401': 'API Key无效，请检查配置',
      '402': '账户余额不足',
      '422': '参数错误',
      '429': '请求过于频繁，请稍后重试',
      '430': '未授权使用该模型',
      '431': '账号已停用',
      '500': '服务器错误，请稍后重试',
      '503': '服务繁忙，请稍后重试',
      '511': 'OCR处理异常',
      '512': '图片下载失败',
      '513': '图片格式不支持',
      '514': '图片大小超过10MB',
      '515': '图片未找到',
      '516': '票据类型选择错误',
    };
    return errorMap[String(code)] || msg || '识别失败';
  },

  // 切换OCR类型
  onOcrTypeChange(e) {
    const index = e.detail.value;
    const selectedType = this.data.ocrTypes[index];
    this.setData({
      ocrType: selectedType.type,
      ocrTypeIndex: index,
      currentOcrTypeName: selectedType.name,
    });
  },

  // 跳转设置页面
  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onConfirm() {
    wx.navigateBack();
  },

  // 重新识别
  onRetry() {
    this.setData({ status: 'idle', errorMsg: '' });
  },

  // 底部导航
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
});