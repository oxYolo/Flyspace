export const issueTypeOptions = [
    // === 工地巡检 ===
    { id: 3, name: "已戴安全帽", dictCode: "safe_hat_on", scene: "construction-site", color: "#00CC00" },
    { id: 5, name: "未戴安全帽", dictCode: "safe_hat_off", scene: "construction-site", color: "#FF0000" },
    { id: 10, name: "已穿反光衣", dictCode: "vest_on", scene: "construction-site", color: "#0099FF" },
    { id: 7, name: "未穿反光衣", dictCode: "vest_off", scene: "construction-site", color: "#FF6600" },
    { id: 12, name: "车辆", dictCode: "vehicle", scene: "construction-site", color: "#00CCCC" },
    { id: 18, name: "物料乱堆乱放", dictCode: "material_disorder", scene: "construction-site", color: "#FFCC00" },
    { id: 19, name: "围挡破损", dictCode: "barrier_damage", scene: "construction-site", color: "#E67E22" },
    { id: 39, name: "渣土车", dictCode: "dump_truck", scene: "construction-site", color: "#1E88E5" }, // 深蓝
    { id: 40, name: "工程车", dictCode: "engineering_vehicle", scene: "construction-site", color: "#00897B" }, // 青绿
    { id: 41, name: "挖掘机", dictCode: "excavator", scene: "construction-site", color: "#6D4C41" }, // 深棕
    { id: 42, name: "推土机", dictCode: "bulldozer", scene: "construction-site", color: "#546E7A" }, // 蓝灰
    { id: 43, name: "起重机", dictCode: "crane", scene: "construction-site", color: "#283593" }, // 靛蓝
    { id: 44, name: "塔吊", dictCode: "tower_crane", scene: "construction-site", color: "#AD1457" }, // 深玫红

    // === 森林防火 ===
    { id: 16, name: "明火识别", dictCode: "fire", scene: "forest", color: "#FF0000" },
    { id: 15, name: "烟雾识别", dictCode: "smoke", scene: "forest", color: "#FF5500" },

    // === 水域巡检 ===
    { id: 22, name: "违法钓鱼", dictCode: "illegal_fishing", scene: "waters", color: "#FF3399" },
    { id: 23, name: "非法捕捞", dictCode: "illegal_harvesting", scene: "waters", color: "#CC00FF" },
    { id: 24, name: "非法采砂", dictCode: "illegal_sand_mining", scene: "waters", color: "#795548" },
    { id: 26, name: "水面漂浮物（垃圾 / 油污）", dictCode: "floating_debris", scene: "waters", color: "#FFCC00" },
    { id: 27, name: "蓝藻爆发", dictCode: "algae_bloom", scene: "waters", color: "#00FF88" },

    // === 违建巡查 ===
    { id: 30, name: "楼顶加建", dictCode: "illegal_rooftop_addition", scene: "illegal-construction", color: "#FF0055" },
    { id: 31, name: "背街隐蔽搭建", dictCode: "hidden_backstreet_construction", scene: "illegal-construction", color: "#9B59B6" },
    { id: 33, name: "违规占用耕地建房", dictCode: "illegal_farmland_construction", scene: "illegal-construction", color: "#FF5722" },
    { id: 34, name: "违规占用公共绿地 / 道路建房", dictCode: "illegal_public_space_construction", scene: "illegal-construction", color: "#FF9800" },
    { id: 35, name: "改变房屋结构 / 用途", dictCode: "structural_change", scene: "illegal-construction", color: "#607D8B" },

    // === 违停巡查 ===
    { id: 38, name: "违停", dictCode: "illegal_parking_small", scene: "illegal-parking", color: "#E53935" },
    // === 违停巡查 ===
    { id: 45, name: "占用消防通道", dictCode: "fire_lane_occupied", scene: "illegal-parking", color: "#D32F2F" },
    { id: 46, name: "占用人行道", dictCode: "sidewalk_occupied", scene: "illegal-parking", color: "#F57C00" },
    { id: 47, name: "占用非机动车道", dictCode: "bike_lane_occupied", scene: "illegal-parking", color: "#FB8C00" },
    { id: 48, name: "占用公交站", dictCode: "bus_stop_occupied", scene: "illegal-parking", color: "#C62828" },
];