/**
 * useYoloExport — YOLO格式导出工具
 * 用法:
 *   const { exportYolo, exportClasses, exportZip } = useYoloExport()
 */
import { ref } from "vue";

export function useYoloExport() {
  /**
   * 单张图片 → YOLO .txt 文件下载
   * @param {Array} yoloAnnotations  [{classIdx, cx, cy, w, h}, ...]
   * @param {string} imageName       原始文件名 (不含扩展名)
   */
  function exportSingleTxt(yoloAnnotations, imageName) {
    const lines = yoloAnnotations
      .filter((a) => a.w > 0 && a.h > 0)
      .map((a) => `${a.classIdx} ${a.cx} ${a.cy} ${a.w} ${a.h}`)
      .join("\n");

    downloadText(lines, `${stripExt(imageName)}.txt`, "text/plain");
  }

  /**
   * 导出 classes.txt
   * @param {string[]} classes  类别名称数组
   */
  function exportClasses(classes) {
    const content = classes.join("\n");
    downloadText(content, "classes.txt", "text/plain");
  }

  /**
   * 批量导出：给定多张图片的标注数据 → 逐个下载 .txt
   * @param {Map<string, Array>} annotationsMap  filename → yoloAnnotations[]
   */
  function exportBatch(annotationsMap) {
    annotationsMap.forEach((annotations, filename) => {
      exportSingleTxt(annotations, filename);
    });
  }

  /**
   * 生成单条 YOLO 行字符串（供调试/预览）
   */
  function formatLine(ann) {
    return `${ann.classIdx} ${ann.cx.toFixed(6)} ${ann.cy.toFixed(6)} ${ann.w.toFixed(6)} ${ann.h.toFixed(6)}`;
  }

  /**
   * 视频帧导出：每帧一个 txt
   * @param {Map<number, Array>} framesMap  frameIndex → yoloAnnotations[]
   * @param {string} videoName
   */
  function exportVideoFrames(framesMap, videoName) {
    framesMap.forEach((annotations, frameIdx) => {
      const frameName = `${stripExt(videoName)}_frame_${String(frameIdx).padStart(6, "0")}`;
      exportSingleTxt(annotations, frameName);
    });
  }

  // ── 内部工具 ──────────────────────────────────────────────
  function downloadText(content, filename, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stripExt(filename) {
    return filename.replace(/\.[^.]+$/, "");
  }

  return {
    exportSingleTxt,
    exportClasses,
    exportBatch,
    exportVideoFrames,
    formatLine,
  };
}
