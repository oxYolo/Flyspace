export const REQUIREMENT_RESULT_TYPE_OPTIONS = [
  { label: "照片", value: "PHOTO" },
  { label: "视频", value: "VIDEO" },
  { label: "三维模型", value: "MODEL_3D" },
  { label: "正射影像", value: "ORTHO" },
  { label: "全景照片", value: "PANORAMA" },
] as const;

export const REQUIREMENT_FLIGHT_TYPE_OPTIONS = [
  { label: "常规", value: 1 },
  { label: "临时", value: 2 },
  { label: "其他", value: 3 },
] as const;

export const REQUIREMENT_STATUS_OPTIONS = [
  { label: "待审核", value: 0 },
  { label: "审核通过", value: 1 },
  { label: "审核驳回", value: 2 },
] as const;

export const REQUIREMENT_AUDIT_ACTION_OPTIONS =
  REQUIREMENT_STATUS_OPTIONS.filter(
    (item) => item.value === 1 || item.value === 2,
  );
