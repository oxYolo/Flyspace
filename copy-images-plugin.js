import fs from "fs";
import path from "path";

export default function copyImagesRecursivePlugin(options = {}) {
  const {
    srcDir = "src",
    distDir = "dist/src",
    include = [".png", ".jpg", ".jpeg", ".gif", ".svg"],
    exclude = [],
    excludeDirs = [], // 新增：排除的目录列表
  } = options;

  function copyDir(src, dist) {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    if (!fs.existsSync(dist)) {
      fs.mkdirSync(dist, { recursive: true });
    }

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const distPath = path.join(dist, entry.name);

      // 跳过排除的目录
      if (excludeDirs.includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        copyDir(srcPath, distPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (include.includes(ext) && !exclude.includes(entry.name)) {
          fs.copyFileSync(srcPath, distPath);
        }
      }
    }
  }

  function removeEmptyDirs(dir) {
    let removed = false;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeEmptyDirs(fullPath); // 先递归处理子目录
      }
    }

    // 再次读取目录内容，判断是否为空
    const remainingEntries = fs.readdirSync(dir);
    if (remainingEntries.length === 0) {
      fs.rmdirSync(dir);
      removed = true;
    }

    return removed;
  }

  return {
    name: "vite-plugin-copy-images-recursive",
    async closeBundle() {
      const absoluteSrc = path.resolve(__dirname, srcDir);
      const absoluteDist = path.resolve(__dirname, distDir);
      copyDir(absoluteSrc, absoluteDist);
      // 复制完成后，清理空目录
      removeEmptyDirs(absoluteDist);
    },
  };
}
