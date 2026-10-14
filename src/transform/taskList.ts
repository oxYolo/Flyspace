import type { CommonApiResponse } from "@/model/baseResponseModel.ts";
import {
  $distributeTask,
  $getJobInfoByTaskId,
  $getOSDMissionPage,
  $getTaskList,
  $getTaskResult,
  $getVideoList,
  $getAIVideoList,
} from "@/api/flyControl/task.ts";
import type { PageOptions } from "@/model/commonModel.ts";
import type { Ref } from "vue";
import { $distributePlan } from "@/api/flyControl/control.ts";
import dayjs from "dayjs";

// 获取所有OSD任务数据的辅助函数
const getAllOSDMissionData = async (mission: any): Promise<any[]> => {
  const allData: any[] = [];
  const currentPage = 1;
  const pageSize = 1000; // 每次最多查询1000条

  const commonParams: any = {
    missionId: mission.jobId,
    pageSize,
    startTime: dayjs(mission.beginTime)
      .startOf("date")
      .format("YYYY-MM-DDTHH:mm:ss"),
    endTime: dayjs(mission.beginTime)
      .endOf("date")
      .format("YYYY-MM-DDTHH:mm:ss"),
  };
  try {
    // 第一次查询
    const firstRes: any = await $getOSDMissionPage({
      pageNum: currentPage,
      ...commonParams,
    });
    if (firstRes.code !== 200 || !firstRes.data) {
      return allData;
    }
    // 添加第一页数据
    if (firstRes.data.records?.length) {
      allData.push(...firstRes.data.records);
    }
    // 检查是否需要继续查询
    const { total, pages } = firstRes.data;
    if (pages > 1) {
      // 创建剩余页面的Promise数组
      const promises: Promise<any>[] = [];

      for (let page = 2; page <= pages; page++) {
        promises.push(
          $getOSDMissionPage({
            pageNum: page,
            ...commonParams,
          }),
        );
      }
      // 并发执行所有请求
      const results: any[] = await Promise.all(promises);
      // 合并所有结果
      results.forEach((res: any) => {
        if (
          res.code === 200 &&
          res.data &&
          res.data.records &&
          res.data.records.length
        ) {
          allData.push(...res.data.records);
        }
      });
    }
    return allData;
  } catch (error) {
    return allData;
  }
};

export const GetTaskList = async (
  params: any,
  pageOptions: Ref<PageOptions>,
) => {
  try {
    const res: any = (await $getTaskList({
      ...params,
      pageSize: pageOptions.value.size,
      pageNum: pageOptions.value.page,
    })) as any;
    pageOptions.value.total = res.total;
    return Promise.resolve(res.rows);
  } catch (e) {
    return Promise.resolve([]);
  }
};

// 查询成果信息
export const GetTaskResult = async (executorId: any) => {
  try {
    const res: any = await $getTaskResult(executorId);
    if (res.code === 200) {
      if (res?.data && Object.keys(res.data) && Object.keys(res.data).length) {
        return {
          type: "success",
          data: {
            photo: res.data.PHOTO || 0,
            video: res.data.VIDEO || 0,
            mapImage: res.data.MAPIAMGE || 0,
          },
          info: res.msg || `查询成功`,
        };
      }
    } else {
      const errorMsg = res.msg || "查询失败";
      return Promise.reject({ type: "error", data: null, info: errorMsg });
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "查询时发生未知错误";
    return Promise.reject({ type: "error", data: null, info: errorMsg });
  }
};

export const GetOSDMission = async (
  taskId: any,
  donceList: any,
  videoList: any,
  loadingState?: Ref<{ loading: boolean; progress: number }>,
) => {
  try {
    // 设置加载状态为true，初始进度为0
    if (loadingState) {
      loadingState.value = { loading: true, progress: 0 };
    }

    const jobInfo: any = await $getJobInfoByTaskId(taskId);
    // 更新进度到30%
    if (loadingState) {
      loadingState.value.progress = 30;
    }

    const job = jobInfo.data.records[0];
    // 获取所有飞行记录数据
    const allMissionData = await getAllOSDMissionData(job);
    // 更新进度到70%
    if (loadingState) {
      loadingState.value.progress = 70;
    }

    const FlyLineArr: any[] = [];
    if (allMissionData && allMissionData.length) {
      allMissionData.forEach((item: any) => {
        donceList.push(item);
        // 排除明显异常数据
        if (
          Number(item.positionInfo.longitude) &&
          Number(item.positionInfo.latitude)
        ) {
          FlyLineArr.push([
            item.positionInfo.longitude,
            item.positionInfo.latitude,
            item.positionInfo.height || 0,
          ]);
        }
      });
    }

    const getNameByUrl = (url: string) => {
      if (!url) return "未知视频";
      const raw = url.split("?")[0];
      const seg = raw.split("/").pop();
      return seg || "未知视频";
    };

    const originalVideoMap = new Map<number, any>();
    const originalVideos: any[] = [];
    const aiVideosBySourceId = new Map<number, any[]>();
    const aiVideosWithoutSource: any[] = [];

    // 查询原始视频，失败不影响AI视频查询
    try {
      const videoRes: any = await $getVideoList(job.jobId);
      if (videoRes.code === 200 && Array.isArray(videoRes?.data)) {
        videoRes.data.forEach((item: any) => {
          const id = Number(item.id);
          if (Number.isFinite(id)) {
            originalVideoMap.set(id, item);
          }

          const startTimeInMs = Number(item.startTime) * 1000;
          originalVideos.push({
            name: item.fileName,
            time: item.createTime,
            url: item.filePath,
            duration: item.timeLen,
            startTime: Number.isFinite(startTimeInMs)
              ? startTimeInMs
              : undefined,
            videoSourceType: "original",
            sourceVideoId: id,
          });
        });
      }
    } catch (error) {
      console.error("获取原始视频失败，不影响AI视频处理:", error);
    }

    // 查询AI视频，失败不影响原始视频播放
    try {
      const aiVideoRes: any = await $getAIVideoList({
        missionId: job.jobId,
        status: "SUCCESS",
      });
      if (aiVideoRes.code === 200 && Array.isArray(aiVideoRes?.data)) {
        aiVideoRes.data.forEach((item: any) => {
          let aiUrl = item.targetFilePath;
          if (!aiUrl && item.resultPayload) {
            try {
              const payload = JSON.parse(item.resultPayload);
              aiUrl = payload?.outputUrl;
            } catch {
              aiUrl = "";
            }
          }
          if (!aiUrl) return;

          const sourceVideo = originalVideoMap.get(Number(item.videoId));
          const sourceStartTimeInMs = Number(sourceVideo?.startTime) * 1000;
          const aiName = getNameByUrl(aiUrl);

          const aiVideo = {
            name: aiName,
            time: item.submitTime || "",
            url: aiUrl,
            duration: sourceVideo?.timeLen,
            startTime: Number.isFinite(sourceStartTimeInMs)
              ? sourceStartTimeInMs
              : undefined,
            videoSourceType: "ai",
            sourceVideoId: item.videoId,
            aiTaskId: item.taskId,
          };

          const sourceId = Number(item.videoId);
          if (Number.isFinite(sourceId) && sourceId > 0) {
            if (!aiVideosBySourceId.has(sourceId)) {
              aiVideosBySourceId.set(sourceId, []);
            }
            aiVideosBySourceId.get(sourceId)!.push(aiVideo);
          } else {
            aiVideosWithoutSource.push(aiVideo);
          }
        });
      }
    } catch (error) {
      console.error("获取AI视频失败，不影响原始视频处理:", error);
    }

    // 顺序要求：原视频1、AI1、原视频2、AI2...
    // 通过原视频响应顺序进行交替合并，确保原视频始终在对应AI视频前面
    originalVideos.forEach((originalVideo: any) => {
      videoList.push(originalVideo);
      const sourceId = Number(originalVideo?.sourceVideoId);
      if (Number.isFinite(sourceId) && aiVideosBySourceId.has(sourceId)) {
        const aiList = aiVideosBySourceId.get(sourceId)!;
        aiList.forEach((aiVideo) => videoList.push(aiVideo));
        aiVideosBySourceId.delete(sourceId);
      }
    });

    // 兜底：若存在未匹配到原视频的AI视频，仍追加到末尾，避免数据丢失
    aiVideosBySourceId.forEach((aiList) => {
      aiList.forEach((aiVideo) => videoList.push(aiVideo));
    });
    aiVideosWithoutSource.forEach((aiVideo) => videoList.push(aiVideo));

    // 更新进度到90%
    if (loadingState) {
      loadingState.value.progress = 90;
    }

    // 按时间排序获取最早和最晚的时间戳
    const sortedByTime = donceList.sort((a: any, b: any) => a.time - b.time);
    const mapStartTime = sortedByTime[0].time;
    const mapEndTime = sortedByTime[sortedByTime.length - 1].time;

    // 视频列表为空时的处理
    let videoStartSecond = 0;
    if (videoList.length > 0) {
      const video = videoList[0];
      videoStartSecond = Math.floor((video.startTime - mapStartTime) / 1000);
    }

    const totalTime = Number((mapEndTime - mapStartTime) / 1000);

    // 加载完成，设置状态为false，进度为100%
    if (loadingState) {
      loadingState.value = { loading: false, progress: 100 };
    }
    return {
      loadTotalTime: totalTime,
      loadVideoStartSecond: videoStartSecond,
      FlyLineArr: FlyLineArr,
    };
  } catch (error) {
    // 出现错误时，也要重置loading状态
    if (loadingState) {
      loadingState.value = { loading: false, progress: 0 };
    }
    const errorMsg =
      error instanceof Error ? error.message : "查询时发生未知错误";
    return Promise.reject({ type: "error", data: null, info: errorMsg });
  }
};

export const handleDistributeTask = async (params: {
  taskId: string;
  planId?: string;
  deviceSn?: string;
  routeId?: string;
}) => {
  try {
    const res = await $distributeTask(params.taskId, {
      planId: params.planId,
      deviceSn: params.deviceSn,
      routeId: params.routeId,
    });
    await $distributePlan(res.data.executorId);
  } catch (e: any) {
    return Promise.reject({ type: "error", data: null, info: e.message });
  }
};
