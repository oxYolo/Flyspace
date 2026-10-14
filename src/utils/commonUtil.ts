import urlConfig from "@/public-path.js";
import type { App } from 'vue';

/**
 * @Description: 通用工具类
 * @Author: LST
 * @Date: 2021-12-20 13:46:01
 */

// 字典数据接口
interface DictItem {
  type: string;
  dictName: string;
  dictValue: string;
  dicName: string;
  dicValue: string;
}

// 节流函数选项接口
interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

// 菜单项接口
interface MenuItem {
  path?: string;
  url?: string;
  menu?: string;
  redirect?: string;
  children?: MenuItem[];
  menu_desc?: string;
  name?: string;
  data?: MenuItem[];
  activated?: boolean;
}

// 参数对象接口
interface ParamsObject {
  [key: string]: any;
}

const toolsArr = {
  /**
   * 获取当前浏览器地址栏url是否包含某个参数
   * @param name 参数名称
   * @returns 参数值或空字符串
   */
  GetQueryString(name: string): string {
    const codes: string = unescape(window.location.href); // 当前url，并进行utf-8转码
    const codeWenhao: string[] = codes.split("?"); // url以 ？号相隔，获取url 问号后面的参数
    if (!codeWenhao[1]) {
      return "";
    }
    const codeLianjie: string[] = codeWenhao[1].split("&"); // url再以 & 符号相隔，获取所有参数key和value
    let codeDenghao: string[] | string = "";
    for (const i in codeLianjie) {
      // 循环所有参数，查找与某个参数对应的key和value
      if (codeLianjie[i].indexOf(`${name}=`) !== -1) {
        // 如果查找到，则以 = 号相隔，获取value
        codeDenghao = codeLianjie[i].split("=");
      }
    }
    if (Array.isArray(codeDenghao) && codeDenghao[1]) {
      // 如果匹配到对应参数，则返回value
      return codeDenghao[1];
    } else {
      return ""; // 返回空
    }
  },

  /**
   * 去除空格
   * @param name 字符串或对象
   * @returns 处理后的结果
   */
  templateBlur(name: string | Record<string, any>): string | Record<string, any> {
    let result: string | Record<string, any> = name;
    if (name) {
      if (typeof name !== "object") {
        result = (name as string).replace(/(^\s*)|(\s*$)/g, "");
      } else {
        for (const key in name) {
          if (
            name[key] !== null &&
            name[key] !== "" &&
            name[key] !== undefined
          ) {
            if (typeof name[key] === "string") {
              name[key] = name[key].replace(/(^\s*)|(\s*$)/g, "");
            }
          }
        }
      }
    }
    return result;
  },

  /**
   * 字符串过滤，移除非数字
   * @param value 输入值
   * @param name 字段名
   * @param letter 过滤类型
   */
  formatStrToNumber(this: any, value: string, name: string, letter?: string): void {
    const arr: string[] = name.split(".");
    const reg = /[\u4e00-\u9fa5]/g;
    const reg1 = /[a-zA-Z+W]/g;
    const reg2 = /\s/g;
    const reg3 = /\D/g;
    let val: string = value.replace(reg, "");
    
    if (letter !== undefined && letter !== null && letter !== "") {
      val = val.replace(reg1, "");
    }
    if (letter === "number") {
      val = val.replace(reg3, "");
    }
    val = val.replace(reg2, "");
    if (!arr[1]) {
      this[arr[0]] = val;
    } else {
      this[arr[0]][arr[1]] = val;
    }
  },

  /**
   * 判断字符串是否为空
   * @param val 待判断的值
   * @returns 是否为空
   */
  isEmpty(val: any): boolean {
    return val === undefined || val === null || val === "";
  },

  /**
   * 过滤特殊符号
   * @param value 输入值
   * @param name 字段名
   */
  formatToCarNum(this: any, value: string, name: string): void {
    const arr: string[] = name.split(".");
    const reg = /[^\u4e00-\u9fa5a-zA-Z0-9]/g;
    const val: string = value.replace(reg, "");
    this[arr[0]][arr[1]] = val;
  },

  /**
   * 字数处理，每3位添加一个逗号分隔，如:123456789 ————> 123,456,789
   * @param value 数值
   * @returns 格式化后的字符串
   */
  SpecialFormatNumber(value: number | string): string | number | undefined {
    if (value === 0) return value;
    if (!value) return;
    let data: string = value.toString();
    const str: string[] = data.split(".");
    data = str[0];
    let s = "";
    if (str.length > 1) s = "." + str[1];
    const length: number = data.length;
    if (length <= 3) return data + s;
    let text = "";
    let c = 0;
    for (let i = length - 1; i >= 0; i--) {
      if (c++ === 3) {
        text = "," + text;
        c = 1;
      }
      text = data[i] + text;
    }
    return text + s;
  },

  /**
   * 字数处理，每1位添加一个逗号分隔，如:123————> 1,2,3
   * @param value 数值
   * @returns 格式化后的字符串
   */
  SplitFormatNumber(value: number | string): string | number | undefined {
    if (value === 0) return value;
    if (!value) return;
    let data: string = value.toString();
    const str: string[] = data.split(".");
    data = str[0];
    let s = "";
    if (str.length > 1) s = "." + str[1];
    const length: number = data.length;
    if (length <= 1) return data + s;
    let text = "";
    let c = 0;
    for (let i = length - 1; i >= 0; i--) {
      if (c++ === 1) {
        text = "," + text;
        c = 1;
      }
      text = data[i] + text;
    }
    return text + s;
  },

  /**
   * 关键字符处理 保留特定首位字符，中间部分*代替 如: 123456789 ————> 12*****89
   * @param input 目标字符串
   * @param frontLen 保留前位数
   * @param endLen 保留后位数
   * @returns 处理后的字符串
   */
  plusXing(input: string, frontLen: number, endLen: number): string | undefined {
    if (!input) return;
    if (input.indexOf(",") > 0) {
      const inputArray: string[] = input.split(",");
      const result: string[] = [];
      for (let idx = 0; idx < inputArray.length; idx++) {
        result.push(doSecret(inputArray[idx]));
      }
      return result.join(",");
    } else {
      return doSecret(input);
    }

    function doSecret(string: string): string {
      const str: string = trim(string);
      let strValue = "";
      if (!str) return strValue;
      if (str.length === 0) {
        strValue = "";
      } else if (str.length < 3) {
        strValue = str.substring(0, 1) + "*";
      } else if (str.length >= 3) {
        if (str.length <= frontLen + endLen) {
          console.log(
            str +
              "字段影藏设置格式不正确，建议字符串的长度大于（frontLen+endLen）"
          );
          let xing = "";
          for (let i = 0; i < str.length - 1; i++) {
            xing += "*";
          }
          strValue = str.substring(0, 1) + xing;
        } else {
          const len: number = str.length - frontLen - endLen;
          let xing = "";
          for (let i = 0; i < len; i++) {
            xing += "*";
          }
          strValue =
            str.substring(0, frontLen) +
            xing +
            str.substring(str.length - endLen);
        }
      }
      return strValue;
    }

    function trim(string: string): string {
      return string.replace(/(^\s*)|(\s*$)/g, "");
    }
  },

  /**
   * 获取格式化完整时间 如: 2021-07-14 09:00:00
   * @param n 当前天数差值
   * @returns 格式化的时间字符串
   */
  getNowFormatWholeDate(n: number = 0): string {
    const date: Date = new Date();
    date.setDate(date.getDate() + n);
    const separator1 = "-";
    const separator2 = ":";
    let month: number | string = date.getMonth() + 1;
    let strDate: number | string = date.getDate();
    let hours: number | string = date.getHours();
    let minutes: number | string = date.getMinutes();
    let seconds: number | string = date.getSeconds();
    
    if (month >= 1 && month <= 9) {
      month = `0${month}`;
    }
    if (strDate >= 0 && strDate <= 9) {
      strDate = `0${strDate}`;
    }
    if (hours >= 0 && hours <= 9) {
      hours = `0${hours}`;
    }
    if (minutes >= 0 && minutes <= 9) {
      minutes = `0${minutes}`;
    }
    if (seconds >= 0 && seconds <= 9) {
      seconds = `0${seconds}`;
    }
    return `${
      date.getFullYear() + separator1 + month + separator1 + strDate
    } ${hours}${separator2}${minutes}${separator2}${seconds}`;
  },

  /**
   * 获取字典配置option
   * @param dictType 字典类型
   * @param type 返回类型 1-数组 2-对象(值->名称) 3-对象(名称->值)
   * @returns Promise<DictItem[] | Record<string, string> | null>
   */
  getDictData(dictType: string, type: number = 1): Promise<DictItem[] | Record<string, string> | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if ((window as any).db) {
          // 如果本地缓存数据库初始化成功
          const trans = (window as any).db.transaction(["dict"], "readwrite");
          const objStore = trans.objectStore("dict");
          const req = objStore.get(dictType);
          req.onsuccess = function () {
            const dictDataArr: DictItem[] = req.result ? req.result.dictData : [];
            if (type === 1) {
              resolve(dictDataArr);
            } else if (type === 2) {
              const dictDataObj: Record<string, string> = {};
              dictDataArr.forEach((item) => {
                dictDataObj[item["dicValue"]] = item["dicName"];
              });
              resolve(dictDataObj);
            } else if (type === 3) {
              const dictDataObj: Record<string, string> = {};
              dictDataArr.forEach((item) => {
                dictDataObj[item["dicName"]] = item["dicValue"];
              });
              resolve(dictDataObj);
            } else {
              resolve(null);
            }
          };
        }
      }, 500);
    });
  },

  /**
   * 获取上个月时间
   * @returns 上个月的年月字符串
   */
  getLastMonthFn(): string {
    const myDate: Date = new Date();
    let curYear: number = myDate.getFullYear();
    let curMonth: number = myDate.getMonth();
    if (curMonth === 0) {
      curYear--; //如果当前月份是1月，那上一个月为去年的12月
      curMonth = 12;
    }
    return `${curYear}-${curMonth < 10 ? "0" + curMonth : curMonth}`;
  },

  /**
   * 节流函数
   * @param fn 执行函数
   * @param wait 间隔时间
   * @param options 选项
   * @returns 节流后的函数
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T, 
    wait: number, 
    options: ThrottleOptions = { leading: true, trailing: false }
  ): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null;
    let previous = 0;
    return function (this: any, ...args: Parameters<T>) {
      const now: number = +new Date();
      // remaining 不触发下一次函数的剩余时间
      if (!previous && options.leading === false) previous = now;
      const remaining: number = wait - (now - previous);
      if (remaining < 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        previous = now;
        fn.apply(this, args);
      } else if (!timer && options.trailing !== false) {
        timer = setTimeout(() => {
          previous = options.leading === false ? 0 : new Date().getTime();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  },

  /**
   * 防抖函数(可用于防止重复提交)
   * @param fn 执行函数
   * @param wait 间隔时间
   * @param immediate 立即执行
   * @returns 防抖后的函数
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T, 
    wait: number, 
    immediate?: boolean
  ): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null;
    return function (this: any, ...args: Parameters<T>) {
      if (timer) clearTimeout(timer);
      if (immediate) {
        // 如果已经执行过，不再执行
        const callNow: boolean = !timer;
        timer = setTimeout(() => {
          timer = null;
        }, wait);
        if (callNow) {
          fn.apply(this, args);
        }
      } else {
        timer = setTimeout(() => {
          fn.apply(this, args);
        }, wait);
      }
    };
  },

  /**
   * 跳转登录页，通过浏览器导航直接定位到登录页面
   * @param redirectFlag 是否需要重定向
   */
  toLoginUrl(redirectFlag: boolean = false): void {
    if (urlConfig.casLogin) {
      window.location.href = urlConfig.casLogoutUrl;
      return;
    }
    let path = "/enterSystem";
    if (location.pathname !== path) {
      sessionStorage.removeItem("userName");
      sessionStorage.removeItem("userAreaCode");
      sessionStorage.removeItem("token");
      if (redirectFlag && location.hash.startsWith("#")) {
        path = `${path}?redirect=${location.hash.substr(1)}`;
      }
      window.location.replace(path);
    }
  },

  /**
   * 单点登陆失败页
   * @param param 平台参数
   */
  toFailPage(param: string = ""): void {
    let path = "/failPage";
    if (param) path = "/failPage?platform=" + param;
    window.location.replace(path);
  },

  /**
   * 判断当前访问的路径是否有权限
   * @param menuHref 菜单路径
   * @returns 是否有权限
   */
  hasMenuPermission(menuHref: string): boolean {
    const systemMenu: string[] = sessionStorage.getItem("systemMenu")
      ? JSON.parse(sessionStorage.getItem("systemMenu")!)
      : [];
    let flag = false;
    const realPath: string = menuHref;
    for (const menuPath of systemMenu) {
      if (
        realPath === menuPath ||
        (menuPath !== "/" && realPath.startsWith(menuPath))
      ) {
        flag = true;
        break;
      }
    }
    return flag;
  },

  /**
   * 处理嵌套数组数据
   * @param arr 数组
   * @param name 名称
   */
  handleNestArr(arr: MenuItem[], name: string): void {
    const targetName: string = name;
    const getMenuHref = (nestArr: MenuItem[]): boolean => {
      let flag = false;
      for (const item of nestArr) {
        if (item.data && item.data.length) {
          item.activated = getMenuHref(item.data);
          if (item.activated) flag = true;
        } else {
          if (item.name === targetName) {
            item.activated = true;
            flag = true;
          } else {
            item.activated = false;
          }
        }
      }
      return flag;
    };
    getMenuHref(arr);
  },

  /**
   * 当前年月
   * @returns 当前年月字符串
   */
  curDateFn(): string {
    const myDate: Date = new Date();
    const curYear: number = myDate.getFullYear();
    let curMonth: number | string = myDate.getMonth() + 1;
    if (curMonth < 10) {
      curMonth = `0${curMonth}`;
    }
    return `${curYear}-${curMonth}`;
  },

  /**
   * 根据区划类型设置参数值k-v
   * @param areaCode 区划编码
   * @param params 参数对象
   * @param paramItemName 参数名称
   * @returns 处理后的参数对象
   */
  paramsLoader(areaCode: string, params: ParamsObject, paramItemName: string): ParamsObject {
    if (areaCode) {
      switch (areaCode.length) {
        case 4: //市级
          params[paramItemName] = "city_code";
          break;
        case 6: //区县
          params[paramItemName] = "county_code";
          break;
        case 9: //镇街
          params[paramItemName] = "town_code";
          break;
        case 12: //村社
          params[paramItemName] = "community_code";
          break;
        case 15: //网格
          params[paramItemName] = "grid_code";
          break;
        case 17: //院落
          params[paramItemName] = "courtyard_code";
          break;
        case 21: //建筑物
          params[paramItemName] = "unifiedaddressid";
          break;
        default: //默认
          params[paramItemName] = "city_code";
          break;
      }
    }
    return params;
  },

  /**
   * 获取区域名称
   * @param areaCode 区划编码
   * @returns 区域名称
   */
  getAreaName(areaCode: string): string | undefined {
    let areaName: string | undefined;
    if (areaCode) {
      switch (areaCode.length) {
        case 4: //市级
          areaName = "city_code";
          break;
        case 6: //区县
          areaName = "county_code";
          break;
        case 9: //镇街
          areaName = "town_code";
          break;
        case 12: //村社
          areaName = "community_code";
          break;
        case 15: //网格
          areaName = "grid_code";
          break;
        case 17: //院落
          areaName = "courtyard_code";
          break;
        case 21: //建筑物
          areaName = "unifiedaddressid";
          break;
        default: //默认
          areaName = "city_code";
          break;
      }
    }
    return areaName;
  },

  /**
   * 根据菜单获取对应的菜单map
   * @param menu 菜单数组
   * @returns 菜单映射对象
   */
  getMenuMap(menu: MenuItem[]): Record<string, MenuItem[]> {
    const menuMap: Record<string, MenuItem[]> = {};
    function getMapTool(menu: MenuItem[]): void {
      menu.forEach((it) => {
        if (it.path || it.url) {
          menuMap[it.path || it.url || it.menu || ''] = it.children || [];
        } else if (it.redirect) {
          if (it.children) getMapTool(it.children);
        }
        if (it.menu_desc === '管理员控制') {
          menuMap[it.path || it.url || it.menu || ''] = it.children || [];
        }
      });
    }
    getMapTool(menu);
    return menuMap;
  },
};

// Vue 插件接口
interface CommonUtilPlugin {
  install(app: App): void;
}

// 导出 Vue 插件
export default {
  install(app: App): void {
    app.config.globalProperties.$common = toolsArr;
  },
} as CommonUtilPlugin;

// 导出工具对象
export const commonTool = toolsArr;

// 导出类型
export type { DictItem, ThrottleOptions, MenuItem, ParamsObject };
