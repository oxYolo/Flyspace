import request from "@/utils/request.ts";
import urlConfig from "@/public-path.ts";

export const $getModelList = () => {
  return Promise.resolve(
    {
      "code": 200,
      "msg": "success",
      "data": [
        { "id": 1, "title": "车辆", "imgsrc": "assets/images/drone/车辆.png", "description": "车辆", "supported": true },
        { "id": 2, "title": "烟雾", "imgsrc": "assets/images/drone/烟雾.png", "description": "烟雾", "supported": true },
        { "id": 3, "title": "火焰", "imgsrc": "assets/images/drone/火点.png", "description": "火焰", "supported": true },
        { "id": 4, "title": "安全锥", "imgsrc": "assets/images/drone/垃圾堆.png", "description": "安全锥", "supported": true },
        { "id": 5, "title": "人员", "imgsrc": "assets/images/drone/人.png", "description": "人员", "supported": true },
        { "id": 6, "title": "安全帽", "imgsrc": "assets/images/drone/安全帽.png", "description": "安全帽", "supported": true },
        { "id": 7, "title": "未戴安全帽", "imgsrc": "assets/images/drone/安全帽.png", "description": "未戴安全帽", "supported": true },
        { "id": 8, "title": "口罩", "imgsrc": "assets/images/drone/安全帽.png", "description": "口罩", "supported": true },
        { "id": 9, "title": "未戴口罩", "imgsrc": "assets/images/drone/安全帽.png", "description": "未戴口罩", "supported": true },
        { "id": 10, "title": "反光衣", "imgsrc": "assets/images/drone/安全帽.png", "description": "反光衣", "supported": true },
        { "id": 11, "title": "未穿反光衣", "imgsrc": "assets/images/drone/安全帽.png", "description": "未穿反光衣", "supported": true },
        { "id": 12, "title": "机械", "imgsrc": "assets/images/drone/工程车辆.png", "description": "机械", "supported": true },
      ]
    }
  );
}

export const $startModelVideo = (data: any) => {
  return request({
    url: `${urlConfig.baseUrl}/api/v1/inference/stream_zlm`,
    method: "post",
    data: data
  });
}
