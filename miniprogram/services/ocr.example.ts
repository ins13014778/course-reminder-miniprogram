/**
 * OCR服务使用示例
 * 演示如何在微信小程序中使用OCR识别功能
 */

import { ocrService } from './ocr';
import { OcrType, OcrTypeNames } from '../types/ocr';
import { ApiError, isApiError } from '../types/error';

/**
 * 示例1: 通用文字识别
 */
export async function exampleGeneralOcr() {
  // 选择图片并识别
  const result = await ocrService.chooseAndRecognize(OcrType.GENERAL);

  if (result.success && result.data) {
    console.log('识别成功:', result.data);
    // 处理识别结果
    result.data.forEach((item) => {
      const elements = item.elements as any;
      if (elements.text) {
        elements.text.forEach((t: any) => {
          console.log('识别文字:', t.text, '置信度:', t.confidence);
        });
      }
    });
  } else if (result.error) {
    console.error('识别失败:', result.error.message);
    console.log('解决方案:', result.error.getSolution());
  }
}

/**
 * 示例2: 身份证识别
 */
export async function exampleIdCardOcr(filePath: string) {
  const result = await ocrService.recognizeIdCard(filePath);

  if (result.success && result.data) {
    const elements = result.data[0]?.elements as any;
    if (elements) {
      console.log('姓名:', elements.name);
      console.log('性别:', elements.gender);
      console.log('民族:', elements.nation);
      console.log('出生日期:', elements.bornDate);
      console.log('住址:', elements.address);
      console.log('身份证号:', elements.IDNumber);
    }
  }
}

/**
 * 示例3: 增值税发票识别
 */
export async function exampleVatInvoiceOcr(filePath: string) {
  const result = await ocrService.recognizeVatInvoice(filePath);

  if (result.success && result.data) {
    const elements = result.data[0]?.elements as any;
    if (elements) {
      console.log('发票名称:', elements.title);
      console.log('发票代码:', elements.invoiceCode);
      console.log('发票号码:', elements.invoiceNo);
      console.log('开票日期:', elements.invoiceDate);
      console.log('购买方:', elements.buyerName);
      console.log('销售方:', elements.sellerName);
      console.log('合计金额:', elements.totalAmountLower);

      // 货物明细
      if (elements.goodsDetails) {
        elements.goodsDetails.forEach((goods: any) => {
          console.log('货物:', goods.goodsName, '金额:', goods.amount);
        });
      }
    }
  }
}

/**
 * 示例4: 火车票识别
 */
export async function exampleTrainTicketOcr(filePath: string) {
  const result = await ocrService.recognizeTrainTicket(filePath);

  if (result.success && result.data) {
    const elements = result.data[0]?.elements as any;
    if (elements) {
      console.log('车次:', elements.trainNo);
      console.log('出发站:', elements.departStation);
      console.log('到达站:', elements.destinationStation);
      console.log('出发日期:', elements.departDate);
      console.log('出发时间:', elements.departTime);
      console.log('座位号:', elements.seatNo);
      console.log('票价:', elements.ticketPrice);
      console.log('乘客姓名:', elements.passengerName);
    }
  }
}

/**
 * 示例5: 错误处理
 */
export async function exampleWithErrorHandling(filePath: string) {
  const result = await ocrService.recognize({
    filePath,
    ocrType: OcrType.ID_CARD,
  });

  if (!result.success && result.error) {
    const error = result.error;

    // 判断错误类型
    if (error.isAuthError()) {
      console.error('认证错误，请检查API Key');
      // 跳转到设置页面配置API Key
    } else if (error.isOcrError()) {
      console.error('OCR处理错误:', error.message);
      // 显示具体的OCR错误信息
      wx.showModal({
        title: '识别失败',
        content: error.getSolution(),
        showCancel: false,
      });
    } else if (error.isRetryable()) {
      console.error('可重试错误:', error.message);
      // 可以自动重试
      wx.showModal({
        title: '服务暂时不可用',
        content: '请稍后重试',
        showCancel: false,
      });
    } else {
      console.error('其他错误:', error.message);
    }
  }
}

/**
 * 示例6: 批量识别不同类型
 */
export async function exampleBatchRecognize(imagePaths: string[]) {
  const results = await Promise.all(
    imagePaths.map((path) => ocrService.recognizeGeneral(path))
  );

  results.forEach((result, index) => {
    if (result.success) {
      console.log(`图片${index + 1}识别成功`);
    } else {
      console.error(`图片${index + 1}识别失败:`, result.error?.message);
    }
  });

  return results;
}

/**
 * 示例7: 使用API Key
 */
export async function exampleWithApiKey(apiKey: string) {
  // 设置API Key (只需设置一次)
  ocrService.setApiKey(apiKey);

  // 之后可以直接调用识别
  const result = await ocrService.chooseAndRecognize(OcrType.GENERAL);
  console.log(result);
}

/**
 * 获取支持的OCR类型列表
 */
export function getSupportedOcrTypes() {
  return Object.entries(OcrTypeNames).map(([type, name]) => ({
    type: type as OcrType,
    name,
  }));
}

export default {
  exampleGeneralOcr,
  exampleIdCardOcr,
  exampleVatInvoiceOcr,
  exampleTrainTicketOcr,
  exampleWithErrorHandling,
  exampleBatchRecognize,
  exampleWithApiKey,
  getSupportedOcrTypes,
};
