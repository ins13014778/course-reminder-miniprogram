/**
 * OCR API 类型定义
 * 文档: https://www.scnet.cn/ac/openapi/doc/2.0/moduleapi/api/ocr.html
 */

/** OCR识别类型枚举 */
export enum OcrType {
  /** 通用文字识别 */
  GENERAL = 'GENERAL',
  /** 大陆身份证 */
  ID_CARD = 'ID_CARD',
  /** 银行卡 */
  BANK_CARD = 'BANK_CARD',
  /** 营业执照 */
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  /** 增值税发票 */
  VAT_INVOICE = 'VAT_INVOICE',
  /** 增值税卷票 */
  VAT_ROLL_INVOICE = 'VAT_ROLL_INVOICE',
  /** 出租车发票 */
  TAXI_INVOICE = 'TAXI_INVOICE',
  /** 火车票 */
  TRAIN_TICKET = 'TRAIN_TICKET',
  /** 航空运输电子客票行程单 */
  AIRPORT_TICKET = 'AIRPORT_TICKET',
  /** 机动车销售统一发票 */
  VEHICLE_SALE_INVOICE = 'VEHICLE_SALE_INVOICE',
}

/** OCR识别类型分类 */
export const OcrTypeCategories = {
  通用识别: [OcrType.GENERAL],
  个人证照: [OcrType.ID_CARD, OcrType.BANK_CARD],
  行业资质: [OcrType.BUSINESS_LICENSE],
  财务票据: [
    OcrType.VAT_INVOICE,
    OcrType.VAT_ROLL_INVOICE,
    OcrType.TAXI_INVOICE,
    OcrType.TRAIN_TICKET,
    OcrType.AIRPORT_TICKET,
    OcrType.VEHICLE_SALE_INVOICE,
  ],
} as const;

/** OCR识别类型名称映射 */
export const OcrTypeNames: Record<OcrType, string> = {
  [OcrType.GENERAL]: '通用文字识别',
  [OcrType.ID_CARD]: '大陆身份证',
  [OcrType.BANK_CARD]: '银行卡',
  [OcrType.BUSINESS_LICENSE]: '营业执照',
  [OcrType.VAT_INVOICE]: '增值税发票',
  [OcrType.VAT_ROLL_INVOICE]: '增值税卷票',
  [OcrType.TAXI_INVOICE]: '出租车发票',
  [OcrType.TRAIN_TICKET]: '火车票',
  [OcrType.AIRPORT_TICKET]: '航空运输电子客票行程单',
  [OcrType.VEHICLE_SALE_INVOICE]: '机动车销售统一发票',
};

/** 通用文字识别元素 */
export interface GeneralElement {
  /** 图像宽度 */
  width: number;
  /** 图像高度 */
  height: number;
  /** 旋转角度 */
  angle: number;
  /** 文字识别结果数组 */
  text: Array<{
    /** 坐标位置 */
    pos: Array<{ x: number; y: number }>;
    /** 识别文字内容 */
    text: string;
    /** 置信度 */
    confidence: number;
  }>;
}

/** 身份证识别元素 */
export interface IdCardElement {
  /** 姓名 */
  name: string;
  /** 性别 */
  gender: string;
  /** 民族 */
  nation: string;
  /** 出生日期 */
  bornDate: string;
  /** 住址 */
  address: string;
  /** 身份证号 */
  IDNumber: string;
  /** 签发机关 */
  issueInstitution: string;
  /** 有效期限 */
  validityPeriod: string;
}

/** 银行卡识别元素 */
export interface BankCardElement {
  /** 银行名称 */
  bankName: string;
  /** 有效期 */
  validThru: string;
  /** 卡号 */
  cardNumber: string;
  /** 持卡人 */
  cardHolder: string;
}

/** 营业执照识别元素 */
export interface BusinessLicenseElement {
  /** 标题 */
  title: string;
  /** 社会信用代码 */
  socialCreditCode: string;
  /** 名称 */
  name: string;
  /** 注册资本 */
  capital: string;
  /** 类型 */
  type: string;
  /** 成立日期 */
  date: string;
  /** 法人类型 */
  directorType: string;
  /** 法人 */
  director: string;
  /** 营业期限 */
  businessTerm: string;
  /** 经营范围 */
  businessScope: string;
  /** 地址 */
  address: string;
}

/** 增值税发票货物明细 */
export interface VatInvoiceGoodsDetail {
  /** 货物名称 */
  goodsName: string;
  /** 规格型号 */
  specificationModel: string;
  /** 单位 */
  unit: string;
  /** 数量 */
  quantity: string;
  /** 单价 */
  unitPrice: string;
  /** 金额 */
  amount: string;
  /** 税率 */
  taxRate: string;
  /** 税额 */
  taxAmount: string;
}

/** 增值税发票识别元素 */
export interface VatInvoiceElement {
  /** 发票名称 */
  title: string;
  /** 发票代码 */
  invoiceCode: string;
  /** 发票号码 */
  invoiceNo: string;
  /** 开票日期 */
  invoiceDate: string;
  /** 购买方名称 */
  buyerName: string;
  /** 购买方纳税人识别号 */
  buyerCode: string;
  /** 销售方名称 */
  sellerName: string;
  /** 销售方纳税人识别号 */
  sellerCode: string;
  /** 合计金额(小写) */
  totalAmountLower: string;
  /** 合计金额(大写) */
  totalAmountUpper: string;
  /** 货物明细列表 */
  goodsDetails: VatInvoiceGoodsDetail[];
  /** 备注 */
  remark: string;
  /** 收款人 */
  payee: string;
  /** 复核人 */
  reviewer: string;
  /** 开票人 */
  drawer: string;
}

/** 火车票识别元素 */
export interface TrainTicketElement {
  /** 票号 */
  ticketNo: string;
  /** 车次 */
  trainNo: string;
  /** 出发站 */
  departStation: string;
  /** 到达站 */
  destinationStation: string;
  /** 出发日期 */
  departDate: string;
  /** 出发时间 */
  departTime: string;
  /** 座位号 */
  seatNo: string;
  /** 票价 */
  ticketPrice: string;
  /** 乘客姓名 */
  passengerName: string;
  /** 座位类型 */
  seatType: string;
  /** 车厢号 */
  carriageNo: string;
}

/** 出租车发票识别元素 */
export interface TaxiInvoiceElement {
  /** 发票代码 */
  invoiceCode: string;
  /** 发票号码 */
  invoiceNo: string;
  /** 开票日期 */
  date: string;
  /** 上车时间 */
  getOnTime: string;
  /** 下车时间 */
  getOffTime: string;
  /** 单价 */
  pricePerKm: string;
  /** 里程 */
  mileage: string;
  /** 金额 */
  amount: string;
  /** 车牌号 */
  carNo: string;
}

/** 航空运输电子客票行程单识别元素 */
export interface AirportTicketElement {
  /** 电子客票号码 */
  ticketNo: string;
  /** 印刷序号 */
  printedNo: string;
  /** 姓名 */
  passengerName: string;
  /** 航班号 */
  flightNo: string;
  /** 起飞日期 */
  departDate: string;
  /** 起飞时间 */
  departTime: string;
  /** 出发站 */
  departStation: string;
  /** 到达站 */
  arriveStation: string;
  /** 座位等级 */
  seatClass: string;
  /** 票价 */
  fare: string;
  /** 燃油附加费 */
  fuelSurcharge: string;
  /** 机场建设费 */
  airportTax: string;
  /** 合计金额 */
  totalAmount: string;
}

/** 机动车销售统一发票识别元素 */
export interface VehicleSaleInvoiceElement {
  /** 发票代码 */
  invoiceCode: string;
  /** 发票号码 */
  invoiceNo: string;
  /** 开票日期 */
  date: string;
  /** 购买方名称 */
  buyerName: string;
  /** 购买方身份证号/组织机构代码 */
  buyerId: string;
  /** 销售方名称 */
  sellerName: string;
  /** 车辆类型 */
  vehicleType: string;
  /** 厂牌型号 */
  brandModel: string;
  /** 车辆识别代号 */
  vin: string;
  /** 发动机号码 */
  engineNo: string;
  /** 价税合计 */
  totalAmount: string;
}

/** 单个识别结果 */
export interface OcrResultItem {
  /** 置信度 */
  confidence: string;
  /** 坐标 */
  coordinate: number[];
  /** 识别元素详情 */
  elements: GeneralElement | IdCardElement | BankCardElement | BusinessLicenseElement |
            VatInvoiceElement | TrainTicketElement | TaxiInvoiceElement | AirportTicketElement |
            VehicleSaleInvoiceElement;
  /** 是否复印件 */
  isCopy: string;
  /** 页码 */
  page: number;
  /** 打印偏移 */
  printOffset: string;
}

/** OCR识别数据 */
export interface OcrData {
  /** 识别结果列表 */
  result: OcrResultItem[];
}

/** OCR响应 */
export interface OcrResponse {
  /** 响应码 */
  code: string;
  /** 响应消息 */
  msg: string;
  /** 识别数据 */
  data: OcrData[];
}
