const tdtTokenList = [
  "618023f041116049b146747c1e243e52",
  "c29c983763d7f0d32bc1299494c4b5d9",
  "11950a6cce639481b6f43baf4194725a",
  "f58dc51e294d79802fb88e6f8d08b8f1",
  "fc06adc7d918613862943f2f742e4a9d",
  "0e11045c92deb48f3e705a0b9073dd12",
  "aad3efefa49c4be7f6e7b4330f174673",
  "aeda1ddab3132aeb40a8643a8031a986",
  "b82999470400ed4c8866340057dd8129",
  "069d823c5e6ffbff0b5be6330d7f08be",
  "a2e97143d0f49c5dc3d76bdd7cdcb5b3",
  "c4540c0bb001f750104db13eefc01e31",
  "22424d4074c68ed54a98a09ba314d1b7",
  "1ebaa19a3ddf46d067cdecde3b5144c9",
  "cf9118cb438b74a33d6741a3915b8b1c",
  "15e206962a15e824011a038a3b4f7036",
  "871b22c783b40aa7ec7462a02b9f1028",
  "e3c050960c097ddb2b0e911ed1b26036",
  "04801d3ffbfe3ed0423d519d09f6c5d7",
];
// 学校内网配置
const wd = {
  systemName: "一网统飞与智能服务",
  cesiumMapCenter: [113.89, 29.15, 60000],
  baseUrl: "http://10.101.240.100:9500",
  webSocketUrl: "ws://10.101.240.100:9500",
  websocketAble: true, // 是否支持websocket、webRTC等连接方式

  videoUrl: "http://10.101.240.100:8011", // 视频服务地址(获取直播流)
  videoRTMPUrl: "rtmp://10.101.240.100:1935/live",

  schoolUrl: "http://10.101.240.60", //  图层管理（学校）
};

// 赤壁正式环境配置
const cb = {
  systemName: "一网统飞与智能服务",
  cesiumMapCenter: [113.89, 29.15, 60000],
  baseUrl: "http://223.75.173.128:19500",
  webSocketUrl: "ws://223.75.173.128:19500",
  websocketAble: true, // 是否支持websocket、webRTC等连接方式

  videoUrl: "http://223.75.173.128:18011", // 视频服务地址(获取直播流)
  videoRTMPUrl: "rtmp://223.75.173.128:11935/live",
};

// 测试环境配置（后端 http://223.75.173.128:50001，前端部署在 /test/UAVIP/）
const test = {
  systemName: "一网统飞与智能服务",
  cesiumMapCenter: [113.89, 29.15, 60000],
  baseUrl: "http://223.75.173.128:50001",
  webSocketUrl: "ws://223.75.173.128:50001",
  websocketAble: true, // 是否支持websocket、webRTC等连接方式

  videoUrl: "http://223.75.173.128:18011", // 视频服务地址(获取直播流)
  videoRTMPUrl: "rtmp://223.75.173.128:11935/live",
};

// 生产环境配置
const production = {
  systemName: "一网统飞与智能服务",
  cesiumMapCenter: [113.89, 29.15, 60000],
  baseUrl: `${window.location.protocol}//${window.location.hostname}:${window.location.port}`,
  webSocketUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`,
  websocketAble: true, // 是否支持websocket、webRTC等连接方式

  videoUrl: `${window.location.protocol}//${window.location.hostname}:18011`, // 视频服务地址(获取直播流)
  videoRTMPUrl: `rtmp://${window.location.hostname}:11935/live`,
};

// 通用配置
const common = {
  // baseUrl: window.location.origin,
  // 黑龙江配置
  hljSurveyWms: {
    terrain: "http://218.10.70.73:8090/iserver1111a/services/map-tpk-DX/wms111",
    sandiao: "http://218.10.70.73:8090/iserver1111a/services/map-tpk-SD/wms111",
    baseSurvey:
      "http://218.10.70.73:8090/iserver1111a/services/map-tpk-JCCH/wms111",
    disasterSurvey:
      "http://218.10.70.73:8090/iserver1111a/services/map-tpk-ZHPC/wms111",
    imagery: "http://218.10.70.73:8090/iserver1111a/services/map-tpk-YX/wms111",
    qiqiharYiAn:
      "http://218.10.70.73:8090/iserver1111a/services/map-agscache-BIG230223YX2023PM/wms111",
    dem: "http://218.10.70.73:8090/iserver1111a/services/map-tpk-hebdx302/wms111",
  },

  // 不用修改的配置
  tdtUrl: "http://t0.tianditu.com", // 天地图服务
  tdtUrlHttps: "http://demo-lt.geostar.com.cn:11413/tdts", // 天地图接口（吉奥）
  sm2Login: {
    publicKey:
      "04512391c634008ab836cf98358fd08ada2c097a43c00409af555630a2c993d3cb349e7dcaccd55a3aafcfcdea5239520d62802760887d76ad340ceb370f68813d",
    cipherMode: 1,
  },
  getTdtToken: () => {
    const randomIndex = Math.floor(Math.random() * tdtTokenList.length);
    return tdtTokenList[randomIndex];
  },
};

// 不同环境变量配置
const services = {
  wd,
  cb,
  test,
  production,
};

window.getUrlConfig = (env) => {
  return Object.assign({}, { ...services[env], ...common });
};
