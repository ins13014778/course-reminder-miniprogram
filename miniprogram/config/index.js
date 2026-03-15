module.exports = {
  apiBaseUrl: 'http://localhost:3000',

  // OCR API 配置
  // 文档: https://www.scnet.cn/ac/openapi/doc/2.0/moduleapi/api/ocr.html
  ocr: {
    baseUrl: 'https://api.scnet.cn/api/llm/v1',
    recognizeEndpoint: '/ocr/recognize',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  },
};
