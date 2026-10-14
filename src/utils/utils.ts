// 匹配 src 下所有常见图片类型
const imageModules = import.meta.glob('/src/**/*.{png,jpg,jpeg,gif,svg,webp}', { eager: true, import: 'default' });

/**
 * 获取图片资源路径
 * @param url 例如 'assets/icons/rtk.svg' 或 'views/xxx/yyy.png' 或 'src/assets/icons/rtk.svg'
 */
export function getImageUrl(url: string, baseUrl = ''): string {
  let finalUrl = baseUrl + url;
  // 去掉开头多余的正斜杠（/）
  finalUrl = finalUrl.replace(/^\/+/, '');
  // 如果已经是 /src/xxx 或 src/xxx，统一成 /src/xxx
  if (finalUrl.startsWith('/src/')) {
    return (imageModules[finalUrl] as unknown as string) || '';
  } else if (finalUrl.startsWith('src/')) {
    return (imageModules['/' + finalUrl] as unknown as string) || '';
  } else {
    return (imageModules['/src/' + finalUrl] as unknown as string) || '';
  }
}

/**
 * 延时执行
 * @param {number} delay 延时时长，单位毫秒
 */
export function wait(delay: number = 0) {
  return new Promise<void>((resolve) =>
    setTimeout(() => resolve(undefined), delay),
  );
}

/**
 * 获取资源模块文件的基础路径
 */
export function getBaseUrl() {
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  let baseUrl = "";
  if (isDev) {
    baseUrl = window.location.origin;
  }
  if (isProd) {
    baseUrl =
      window.location.origin +
      "/" +
      window.location.pathname.split("/")[1];
  }
  return baseUrl;
}

/**
 * 导入Public目录下资源模块文件的数据对象
 * @param url 模块资源路径
 */
export async function fetchImportPublicJS(url: string) {
  if (!url?.trim()) {
    throw new Error("路径不能为空");
  }

  const finalUrl = getBaseUrl() + url;

  try {
    const module = await import(finalUrl);
    return module.default;
  } catch (error) {
    console.error(`加载失败 [${finalUrl}]:`, error);
    throw error;
  }
}

/**
 * 监听窗口事件
 * @param {string} name 事件名称
 * @param {function} fun 事件回调
 */
export const listenWindowEvent = ({
  name,
  fun,
}: {
  name: string;
  fun: EventListener;
}) => {
  window.addEventListener(name, fun);
};

/**
 * 取消监听窗口事件
 * @param {string} name 事件名称
 * @param {function} fun 事件回调
 */
export const offListenWindowEvent = ({
  name,
  fun,
}: {
  name: string;
  fun: EventListener;
}) => {
  window.removeEventListener(name, fun);
};

/**
 * 将字符串转换为 kebab-case 格式，同时尽量避免对数字的不合理处理
 * @param {string} str - 要转换的原始字符串
 * @returns {string} 转换后的 kebab-case 格式字符串
 */
export const transformKebabCase = (str: string) => {
  return str
    .replace(/([A-Z])/g, "-$1")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/-(?=\d)/g, "");
};

/**
 * 保留有效数字
 * @param {number} num --要转换的原始数字
 * @param {number} precision --精度
 * @returns
 */
export const formatNumber = (num: number, precision: number = 6) => {
  const formatted = Number(num).toFixed(precision);
  // 将结果转换为数字，去除末尾可能存在的多余 0
  const result = +formatted;
  return result;
};

/**
 * 将指定的 HTML 元素绘制到 Canvas 上，并导出为图片的 Data URL
 * @param {HTMLElement} image - 需要绘制的 HTML 元素
 * @param {Object} size - Canvas 的尺寸配置
 * @param {number} size.width - Canvas 的宽度，默认值为 230
 * @param {number} size.height - Canvas 的高度，默认值为 120
 * @returns {string | undefined} - 返回图片的 Data URL，如果绘制失败则返回空
 */
export const convertElementToImage = (
  image: HTMLElement,
  size: { width: number; height: number },
) => {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.width = size?.width || 230;
  canvas.height = size?.height || 120;
  if (!canvas || !image) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("无法获取 canvas 的 2D 上下文");
    return;
  }

  ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
};


/**
 * 获取网页根元素字体大小
 * @returns {number} 字体大小
 */
export const getRootFontSize = () => {
  const rootFontSize = parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  return rootFontSize;
}


/**
 * 把秒转换成时-分-秒
 * @returns {number} 字体大小
 */
export const formatSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const remainingSeconds = seconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  // 格式化小时、分钟、秒，确保两位数（除了小时可以任意位数）
  const formattedHours = String(hours);
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = secs.toFixed(0).padStart(2, '0'); // 保留3位小数，并确保总长度为6（例如 "04.639"）

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * 计算两个经纬度坐标之间的距离（单位：公里）
 * @returns 距离（公里）
 * @param coord1
 * @param coord2
 */
export const calculateDistance = (coord1: [number, number, number], coord2: [number, number, number]) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  // 将经纬度从度转换为弧度
  const radLat1 = lat1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;
  const deltaLat = radLat2 - radLat1;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  // Haversine 公式
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadius = 6371; // 地球半径（公里）

  return Number((earthRadius * c).toFixed(4));
}
