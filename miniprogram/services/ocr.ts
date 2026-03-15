import { OcrType, OcrResponse, OcrResultItem } from '../types/ocr';
import { ErrorCode, ApiError, createApiError } from '../types/error';

/** OCR API 配置 */
const OCR_API_CONFIG = {
  /** API基础地址 */
  baseUrl: 'https://api.scnet.cn/api/llm/v1',
  /** OCR识别接口 */
  recognizeEndpoint: '/ocr/recognize',
  /** 最大图片大小 10MB */
  maxFileSize: 10 * 1024 * 1024,
  /** 支持的图片格式 */
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  /** 默认API Key */
  defaultApiKey: 'sk-NjEwLTExMTk0NDQzMzA3LTE3NzMzMTM3MjA5NTM=',
};

/** OCR识别选项 */
export interface OcrRecognizeOptions {
  /** 图片文件路径 */
  filePath: string;
  /** OCR识别类型 */
  ocrType: OcrType;
  /** API Key (可选，默认从存储中获取) */
  apiKey?: string;
}

/** OCR识别结果 */
export interface OcrRecognizeResult {
  /** 是否成功 */
  success: boolean;
  /** 识别结果 */
  data?: OcrResultItem[];
  /** 错误信息 */
  error?: ApiError;
}

/**
 * OCR服务
 * 文档: https://www.scnet.cn/ac/openapi/doc/2.0/moduleapi/api/ocr.html
 */
export const ocrService = {
  /**
   * 获取API Key
   * @returns API Key
   */
  getApiKey(): string {
    const storedKey = wx.getStorageSync('ocr_api_key') || wx.getStorageSync('token');
    return storedKey || OCR_API_CONFIG.defaultApiKey;
  },

  /**
   * 设置API Key
   * @param apiKey API Key
   */
  setApiKey(apiKey: string): void {
    wx.setStorageSync('ocr_api_key', apiKey);
  },

  /**
   * 验证图片文件
   * @param filePath 文件路径
   * @returns 是否有效
   */
  validateImage(filePath: string): { valid: boolean; error?: ApiError } {
    // 获取文件扩展名
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    // 检查格式
    if (!OCR_API_CONFIG.supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: createApiError(ErrorCode.OCR_IMAGE_TYPE_ERROR,
          `不支持的图片格式: ${ext}，支持格式: ${OCR_API_CONFIG.supportedFormats.join(', ')}`),
      };
    }

    // 检查文件大小
    try {
      const fileInfo = wx.getFileSystemManager().statSync(filePath);
      if (fileInfo.size > OCR_API_CONFIG.maxFileSize) {
        return {
          valid: false,
          error: createApiError(ErrorCode.OCR_IMAGE_SIZE_EXCEEDED,
            `图片大小 ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB 超过10MB限制`),
        };
      }
    } catch (e) {
      return {
        valid: false,
        error: createApiError(ErrorCode.OCR_IMAGE_NOT_FOUND, '无法获取图片文件信息'),
      };
    }

    return { valid: true };
  },

  /**
   * OCR图片识别
   * @param options 识别选项
   * @returns 识别结果
   */
  async recognize(options: OcrRecognizeOptions): Promise<OcrRecognizeResult> {
    const { filePath, ocrType, apiKey } = options;

    // 验证图片
    const validation = this.validateImage(filePath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 获取API Key
    const key = apiKey || this.getApiKey();

    return new Promise((resolve) => {
      wx.uploadFile({
        url: `${OCR_API_CONFIG.baseUrl}${OCR_API_CONFIG.recognizeEndpoint}`,
        filePath,
        name: 'file',
        formData: {
          ocrType,
        },
        header: {
          'Authorization': `Bearer ${key}`,
        },
        success: (res) => {
          try {
            const data: OcrResponse = JSON.parse(res.data);

            // 检查响应码
            if (data.code !== '0' && data.code !== '200' && data.code !== 0 && data.code !== 200) {
              const errorCode = parseInt(data.code) as ErrorCode;
              resolve({
                success: false,
                error: createApiError(errorCode, data.msg),
              });
              return;
            }

            // 返回识别结果
            const results: OcrResultItem[] = [];
            if (data.data && Array.isArray(data.data)) {
              data.data.forEach((item) => {
                if (item.result && Array.isArray(item.result)) {
                  results.push(...item.result);
                }
              });
            }

            resolve({
              success: true,
              data: results,
            });
          } catch (e) {
            resolve({
              success: false,
              error: createApiError(ErrorCode.INTERNAL_SERVER_ERROR, '响应解析失败'),
            });
          }
        },
        fail: (err) => {
          resolve({
            success: false,
            error: createApiError(ErrorCode.SERVICE_UNAVAILABLE, err.errMsg || '网络请求失败'),
          });
        },
      });
    });
  },

  /**
   * 通用文字识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeGeneral(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.GENERAL });
  },

  /**
   * 身份证识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeIdCard(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.ID_CARD });
  },

  /**
   * 银行卡识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeBankCard(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.BANK_CARD });
  },

  /**
   * 营业执照识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeBusinessLicense(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.BUSINESS_LICENSE });
  },

  /**
   * 增值税发票识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeVatInvoice(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.VAT_INVOICE });
  },

  /**
   * 火车票识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeTrainTicket(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.TRAIN_TICKET });
  },

  /**
   * 出租车发票识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeTaxiInvoice(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.TAXI_INVOICE });
  },

  /**
   * 航空行程单识别
   * @param filePath 图片路径
   * @returns 识别结果
   */
  async recognizeAirportTicket(filePath: string): Promise<OcrRecognizeResult> {
    return this.recognize({ filePath, ocrType: OcrType.AIRPORT_TICKET });
  },

  /**
   * 选择图片并识别
   * @param ocrType OCR类型
   * @returns 识别结果
   */
  async chooseAndRecognize(ocrType: OcrType): Promise<OcrRecognizeResult> {
    return new Promise((resolve) => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = res.tempFiles[0].tempFilePath;
          const result = await this.recognize({ filePath, ocrType });
          resolve(result);
        },
        fail: (err) => {
          resolve({
            success: false,
            error: createApiError(ErrorCode.OCR_IMAGE_NOT_FOUND, err.errMsg || '选择图片失败'),
          });
        },
      });
    });
  },
};

export default ocrService;
