import { Injectable } from '@nestjs/common';
import * as https from 'https';
import * as FormData from 'form-data';

@Injectable()
export class OcrService {
  private readonly apiUrl = process.env.OCR_API_URL;
  private readonly apiKey = process.env.OCR_API_KEY;

  async recognizeImage(fileBuffer: Buffer, filename: string): Promise<string> {
    console.log('开始OCR识别', { filename, bufferSize: fileBuffer.length });
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: 'image/jpeg',
    });
    formData.append('ocrType', 'GENERAL');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('OCR请求超时');
        reject(new Error('OCR请求超时'));
      }, 30000);

      const req = formData.submit({
        protocol: 'https:',
        host: 'api.scnet.cn',
        path: '/api/llm/v1/ocr/recognize',
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }, (err, res) => {
        if (err) {
          clearTimeout(timeout);
          console.error('OCR请求错误:', err.message);
          return reject(err);
        }

        console.log('收到OCR响应', { statusCode: res.statusCode });

        let data = '';
        res.on('data', chunk => {
          data += chunk;
          console.log('接收数据块', { chunkSize: chunk.length, totalSize: data.length });
        });
        res.on('end', () => {
          clearTimeout(timeout);
          console.log('OCR响应完成', { dataLength: data.length });
          try {
            const result = JSON.parse(data);
            console.log('OCR解析结果', { code: result.code, hasData: !!result.data });
            if (result.code === '0' && result.data?.[0]?.result) {
              const results = result.data[0].result;
              const texts = results.map(item => {
                if (item.elements) {
                  return Object.values(item.elements).flat().filter(v => v).join(' ');
                }
                return '';
              }).filter(text => text);
              console.log('OCR识别成功', { textCount: texts.length });
              resolve(texts.join('\n'));
            } else {
              console.error('OCR识别失败', { result });
              reject(new Error(`OCR识别失败: ${result.msg || '未知错误'}`));
            }
          } catch (error) {
            console.error('OCR响应解析错误:', { error: error.message, data });
            reject(error);
          }
        });
        res.on('error', (error) => {
          clearTimeout(timeout);
          console.error('OCR响应流错误:', error.message);
          reject(error);
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        console.error('OCR请求流错误:', error.message);
        reject(error);
      });
    });
  }
}
