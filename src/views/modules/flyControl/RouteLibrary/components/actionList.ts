import rotateYaw from "@/assets/images/tool/飞行器偏航角.svg";
import gimbalPitchRotateAngle from "@/assets/images/tool/云台俯仰角.svg";
import gimbalYawRotateAngle from "@/assets/images/tool/云台偏航角.svg";
import zoom from "@/assets/images/tool/相机变焦.svg";
import startRecord from "@/assets/images/tool/开始录像.svg";
import stopRecord from "@/assets/images/tool/停止录像.svg";
import hoverTime from "@/assets/images/tool/悬停.svg";
import takePhotoType from "@/assets/images/tool/拍照.svg";
import height from "@/assets/images/tool/高度.svg";
import orientedPhotoMode from '@/assets/images/tool/相机2.svg'
import panoShot from '@/assets/images/tool/360度、全景.svg'

export function createActionList() {
  return [
    {
      alt: "飞行器偏航角", // 功能描述
      label: "aircraftHeading", // 调整参数名称
      image: rotateYaw, // 图标
      value: 0, // 调用参数值
      unit: "°", // 单位
      min: -180,  // 最小值
      max: 180, // 最大值
      type: "angle",  // 参数类型
      actuatorFunc: "rotateYaw",  // 功能标识
      actParams: {
        aircraftHeading: 0,
        aircraftPathMode: 'counterClockwise'
      }, // 功能涉及参数
    },
    {
      alt: "云台俯仰角",
      label: "gimbalPitchRotateAngle",
      image: gimbalPitchRotateAngle,
      value: 0,
      unit: "°",
      min: -120,
      max: 45,
      type: "angle",
      actuatorFunc: "gimbalRotate",
      actParams: {
        gimbalPitchRotateAngle: 0
      }
    },
    {
      alt: "云台偏航角",
      label: "gimbalYawRotateAngle",
      image: gimbalYawRotateAngle,
      value: 0,
      unit: "°",
      min: -180,
      max: 180,
      type: "angle",
      actuatorFunc: "gimbalRotate",
      actParams: {
        gimbalYawRotateAngle: 0
      }
    },
    {
      alt: "变焦倍率",
      label: "zoom",
      image: zoom,
      value: 48,
      unit: "X",
      min: 48,
      max: 4800,
      type: "zoom",
      actuatorFunc: "zoom",
      actParams: {
        zoom: 48
      }
    },
    {
      alt: "开始录像",
      label: "startRecord",
      image: startRecord,
      value: true,
      actuatorFunc: "startRecord",
      actParams: {
        startRecord: true
      }
    },
    {
      alt: "停止录像",
      label: "stopRecord",
      image: stopRecord,
      value: true,
      actuatorFunc: "stopRecord",
      actParams: {
        stopRecord: true
      }
    },
    {
      alt: "悬停时间",
      label: "hoverTime",
      image: hoverTime,
      value: 10,
      type: "number",
      min: 0,
      max: 1000,
      unit: "s",
      actuatorFunc: "hover",
      actParams: {
        hoverTime: 10
      }
    },
    {
      alt: "拍照",
      label: "takePhotoType",
      image: takePhotoType,
      value: 0,
      actuatorFunc: "takePhoto",
      actParams: {
        takePhotoType: 0
      }
    },
    {
      alt: "定向拍照",
      label: "orientedPhotoMode",
      image: orientedPhotoMode,
      value: 'normalPhoto',
      actuatorFunc: "orientedShoot",
      actParams: {
        orientedPhotoMode: 'normalPhoto'
      }
    },
    {
      alt: "全景拍照",
      label: "panoShot",
      image: panoShot,
      value: 1,
      actuatorFunc: "panoShot",
      actParams: {
        takePhotoType: 1
      }
    },
    {
      alt: "高度",
      label: "height",
      image: height,
      value: 100.0,
      unit: "m",
      min: 5,
      max: 500,
      type: "angle",
      actParams: {
        height: 100.0
      },
    },
  ];
} 