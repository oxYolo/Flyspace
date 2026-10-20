export interface ClarificationCandidate {
  // id 是后端真实资源标识，提交候选时必须使用它，不能用展示名称替代。
  id?: string;
  // name/title 只用于界面展示，允许同名资源同时存在。
  name?: string;
  title?: string;
  description?: string;
  // 以下字段主要用于区分同名航线，设备和识别目标通常不会返回。
  waylineType?: number | string | null;
  updateTime?: string | null;
  airspace?: string | null;
  droneType?: number | string | null;
  kind?: string;
  confidence?: number;
  reason?: string;
}

export interface ClarificationStep {
  id?: string;
  title?: string;
  step?: string;
  skill_name?: string;
  expected_output?: string;
  task_type_id?: string;
}

export interface LowAltitudeWeather {
  // rainfall 是机场雨情等级，不是毫米雨量；文案优先使用 rainfallLabel。
  status?: string;
  rainfall?: number;
  rainfallLabel?: string;
  deviceSn?: string;
  observedAt?: number;
  checkedAt?: number;
}

export interface LowAltitudeContext {
  operation?: string;
  stepId?: string;
  taskId?: string;
  reason?: string;
  // 确认时必须原样回传最新指纹，前端不能自行计算或拼接。
  fingerprint?: string;
  fields?: string[];
  args?: Record<string, unknown>;
  candidates?: ClarificationCandidate[];
  // true 表示本次确认后会继续下发，不能等同于已经执行成功。
  willPublish?: boolean;
  weather?: LowAltitudeWeather;
  // 设备实时位置，用于定位飞控页面。
  device?: {
    longitude?: number;
    latitude?: number;
    altitude?: number;
  };
}

export interface ChatbotClarification {
  type?: string;
  assistantMessageId?: number;
  taskRunId?: string;
  taskTypeId?: string;
  taskId?: string;
  steps?: ClarificationStep[];
  options?: ClarificationCandidate[];
  defaultSelectedSkillNames?: string[];
  allowedSkillNames?: string[];
  selectionMode?: string;
  minSelection?: number;
  maxSelection?: number;
  friendly_message?: string;
  message?: string;
  missing_fields?: string[];
  field_questions?: Record<string, string>;
  field_types?: Record<string, string>;
  accepts_key_value?: boolean;
  lowAltitude?: LowAltitudeContext;
}

export interface ClarificationSubmission {
  // request 会作为顶层请求体中的字符串发送；结构化交互在这里提前序列化。
  request: string;
  // displayText 只写入聊天记录，允许使用中文，不参与后端协议解析。
  displayText: string;
}
