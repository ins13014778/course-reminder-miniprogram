/**
 * API 错误码定义
 * 文档: https://www.scnet.cn/ac/openapi/doc/2.0/moduleapi/api/errorcode.html
 */

/** API错误码枚举 */
export enum ErrorCode {
  /** 格式错误 */
  BAD_REQUEST = 400,
  /** 认证失败 */
  UNAUTHORIZED = 401,
  /** 余额不足 */
  PAYMENT_REQUIRED = 402,
  /** 参数错误 */
  UNPROCESSABLE_ENTITY = 422,
  /** 请求速率达到上限 */
  RATE_LIMIT_EXCEEDED = 429,
  /** 未授权模型 */
  MODEL_UNAUTHORIZED = 430,
  /** 账号停用 */
  ACCOUNT_DISABLED = 431,
  /** 账号错误 */
  ACCOUNT_ERROR = 432,
  /** 服务器故障 */
  INTERNAL_SERVER_ERROR = 500,
  /** 服务器繁忙 */
  SERVICE_UNAVAILABLE = 503,
  /** 模型错误 */
  MODEL_ERROR = 510,
  /** OCR处理异常 */
  OCR_ERROR = 511,
  /** OCR图片下载失败 */
  OCR_IMAGE_DOWNLOAD_FAILED = 512,
  /** OCR图片类型错误 */
  OCR_IMAGE_TYPE_ERROR = 513,
  /** OCR图片大小超过10M */
  OCR_IMAGE_SIZE_EXCEEDED = 514,
  /** OCR图片未找到 */
  OCR_IMAGE_NOT_FOUND = 515,
  /** OCR票据类型选择错误 */
  OCR_TICKET_TYPE_ERROR = 516,
}

/** 错误码信息 */
export interface ErrorCodeInfo {
  /** 错误码 */
  code: ErrorCode;
  /** 描述 */
  description: string;
  /** 原因及解决方法 */
  solution: string;
}

/** 错误码映射表 */
export const ErrorCodeMap: Record<ErrorCode, ErrorCodeInfo> = {
  [ErrorCode.BAD_REQUEST]: {
    code: ErrorCode.BAD_REQUEST,
    description: '格式错误',
    solution: 'Authorization格式错误，正确格式为Bearer <API Key>；请根据错误信息提示修改请求体',
  },
  [ErrorCode.UNAUTHORIZED]: {
    code: ErrorCode.UNAUTHORIZED,
    description: '认证失败',
    solution: 'API key错误，认证失败；请检查API key是否正确，如没有请先创建',
  },
  [ErrorCode.PAYMENT_REQUIRED]: {
    code: ErrorCode.PAYMENT_REQUIRED,
    description: '余额不足',
    solution: '账号余额不足；请确认账户余额并前往充值页面进行充值',
  },
  [ErrorCode.UNPROCESSABLE_ENTITY]: {
    code: ErrorCode.UNPROCESSABLE_ENTITY,
    description: '参数错误',
    solution: '请求体参数错误；请根据错误信息提示修改相关参数',
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    description: '请求速率达到上限',
    solution: '请求速率（TPM或RPM）达到上限；请合理规划请求速率',
  },
  [ErrorCode.MODEL_UNAUTHORIZED]: {
    code: ErrorCode.MODEL_UNAUTHORIZED,
    description: '未授权模型',
    solution: '账号调用未授权的模型；请联系平台客服',
  },
  [ErrorCode.ACCOUNT_DISABLED]: {
    code: ErrorCode.ACCOUNT_DISABLED,
    description: '账号停用',
    solution: '账号停用；请联系平台客服协助排查账号停用原因后启用账户',
  },
  [ErrorCode.ACCOUNT_ERROR]: {
    code: ErrorCode.ACCOUNT_ERROR,
    description: '账号错误',
    solution: '账号名或密码错误；请重试用户名或密码',
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    description: '服务器故障',
    solution: '服务器内部故障；请等待后重试，若问题一直存在请联系解决',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    code: ErrorCode.SERVICE_UNAVAILABLE,
    description: '服务器繁忙',
    solution: '服务器负载过高；请稍后重试请求',
  },
  [ErrorCode.MODEL_ERROR]: {
    code: ErrorCode.MODEL_ERROR,
    description: '模型错误',
    solution: '模型调用错误；请联系平台客服',
  },
  [ErrorCode.OCR_ERROR]: {
    code: ErrorCode.OCR_ERROR,
    description: 'OCR处理异常',
    solution: 'OCR处理错误；请联系平台客服',
  },
  [ErrorCode.OCR_IMAGE_DOWNLOAD_FAILED]: {
    code: ErrorCode.OCR_IMAGE_DOWNLOAD_FAILED,
    description: 'OCR处理异常，图片下载失败',
    solution: '图片下载错误；请确认图片地址是否正确',
  },
  [ErrorCode.OCR_IMAGE_TYPE_ERROR]: {
    code: ErrorCode.OCR_IMAGE_TYPE_ERROR,
    description: 'OCR处理异常，图片类型错误',
    solution: '图片类型错误；请确认图片类型是否正确',
  },
  [ErrorCode.OCR_IMAGE_SIZE_EXCEEDED]: {
    code: ErrorCode.OCR_IMAGE_SIZE_EXCEEDED,
    description: 'OCR处理异常，图片大小超过10M',
    solution: '图片大小超过10M；请限制图片大小',
  },
  [ErrorCode.OCR_IMAGE_NOT_FOUND]: {
    code: ErrorCode.OCR_IMAGE_NOT_FOUND,
    description: 'OCR处理异常，图片未找到',
    solution: '图片未找到；请确认图片地址是否正确',
  },
  [ErrorCode.OCR_TICKET_TYPE_ERROR]: {
    code: ErrorCode.OCR_TICKET_TYPE_ERROR,
    description: 'OCR处理异常，票据类型选择错误',
    solution: '票据类型选择错误；请确认票据类型是否正确',
  },
};

/** API错误类 */
export class ApiError extends Error {
  /** 错误码 */
  code: ErrorCode;
  /** 错误信息 */
  msg: string;

  constructor(code: ErrorCode, msg?: string) {
    const errorInfo = ErrorCodeMap[code];
    super(msg || errorInfo?.description || '未知错误');
    this.name = 'ApiError';
    this.code = code;
    this.msg = msg || errorInfo?.description || '';
  }

  /** 获取错误解决方案 */
  getSolution(): string {
    return ErrorCodeMap[this.code]?.solution || '请联系客服';
  }

  /** 是否为OCR相关错误 */
  isOcrError(): boolean {
    return this.code >= ErrorCode.OCR_ERROR && this.code <= ErrorCode.OCR_TICKET_TYPE_ERROR;
  }

  /** 是否为认证相关错误 */
  isAuthError(): boolean {
    return this.code === ErrorCode.UNAUTHORIZED ||
           this.code === ErrorCode.ACCOUNT_DISABLED ||
           this.code === ErrorCode.ACCOUNT_ERROR;
  }

  /** 是否为可重试错误 */
  isRetryable(): boolean {
    return this.code === ErrorCode.INTERNAL_SERVER_ERROR ||
           this.code === ErrorCode.SERVICE_UNAVAILABLE ||
           this.code === ErrorCode.RATE_LIMIT_EXCEEDED;
  }
}

/**
 * 根据错误码获取错误信息
 * @param code 错误码
 * @returns 错误信息
 */
export function getErrorInfo(code: ErrorCode): ErrorCodeInfo | undefined {
  return ErrorCodeMap[code];
}

/**
 * 创建API错误
 * @param code 错误码
 * @param msg 错误消息
 * @returns API错误实例
 */
export function createApiError(code: ErrorCode, msg?: string): ApiError {
  return new ApiError(code, msg);
}

/**
 * 判断是否为API错误
 * @param error 错误对象
 * @returns 是否为API错误
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
