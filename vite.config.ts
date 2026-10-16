import { fileURLToPath, URL } from "node:url";
import path from 'path'
import { resolve } from 'path'
import { defineConfig, splitVendorChunkPlugin } from "vite";
import inject from '@rollup/plugin-inject'
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { createHtmlPlugin } from "vite-plugin-html";
import copyImagesRecursivePlugin from "./copy-images-plugin";
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

// import vueDevTools from 'vite-plugin-vue-devtools'
// https://vite.dev/config/
// 仅提供极简 Buffer 垫片，覆盖运行期对 Buffer.alloc 的引用
const bufferPolyfillPlugin = () => ({
  name: 'buffer-polyfill:virtual',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id === 'buffer') return '\0buffer-polyfill';
  },
  load(id: string) {
    if (id === '\0buffer-polyfill') {
      return [
        '// Minimal browser Buffer shim (shape-only).',
        'export function Buffer() {}',
        'Buffer.alloc = function (n) { return new Uint8Array((n >>> 0) || 0); };',
        'Buffer.allocUnsafe = function (n) { return new Uint8Array((n >>> 0) || 0); };',
        'Buffer.allocUnsafeSlow = function (n) { return new Uint8Array((n >>> 0) || 0); };',
        'Buffer.from = function (input, encoding) {',
        '  if (input instanceof Uint8Array) return new Uint8Array(input);',
        '  if (input instanceof ArrayBuffer) return new Uint8Array(input);',
        '  if (Array.isArray(input)) return Uint8Array.from(input);',
        '  if (typeof input === "string") {',
        '    try { return new TextEncoder().encode(input); } catch (_) {',
        '      var arr = []; for (var i = 0; i < input.length; i++) arr.push(input.charCodeAt(i) & 255);',
        '      return Uint8Array.from(arr);',
        '    }',
        '  }',
        '  return new Uint8Array(0);',
        '};',
        'Buffer.isBuffer = function (v) { return v instanceof Uint8Array; };',
        'Buffer.prototype = {};',
        'export default { Buffer };'
      ].join('\n');
    }
  }
});

export default defineConfig(({ command, mode }) => ({
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
  // remove buffer-related optimizeDeps/defines
  server: {
    port: 9000,
    open: true,
    fs: {
      // 允许访问的目录（主项目 + 公共组件库）
      allow: [
        // 主项目根目录（默认已包含，可省略）
        path.resolve(__dirname, './'),
      ]
    },
    proxy: {
      '/api': {
        target: 'http://10.201.156.130:3000',
        changeOrigin: true,
        secure: false
      },
      "/engine": { // 航线置信度
        target: 'http://10.101.240.100:9500',
        changeOrigin: true,
        secure: false,
      },
      "/gn-agent": { // 智能体对话（SSE 流式），避免浏览器跨域
        target: 'http://10.101.240.85:8000',
        changeOrigin: true,
        secure: false,
      },
      "/data": { // 禁飞区管理-练习功能：禁飞区列表查询接口
        target: 'http://223.75.173.128:19500',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  plugins: [
    vue(),
    vueJsx(),
    // 更稳妥的自动 vendor 拆分，降低入口 index-*.js 体积
    splitVendorChunkPlugin(),
    // 为第三方包提供虚拟 buffer 模块（避免被外部化）
    bufferPolyfillPlugin(),
    // 自动按需注入 Buffer 变量（import 自上面的虚拟模块）
    inject({ Buffer: ['buffer', 'Buffer'] }),
    createHtmlPlugin({
      inject: {
        data: {
          title: "",
        },
      },
    }),
    AutoImport({
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
      imports: ["vue", "vue-router"],
      dts: true,
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
      dts: true,
    }),
    // 生成 gzip 和 br 压缩文件，部署端开启静态压缩优先返回可显著降低传输体积
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    // viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    // 仅在构建时输出体积分布报告，便于定位大模块
    ...(command === 'build' ? [
      visualizer({
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false
      })
    ] : [])
  ],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: "public", replacement: fileURLToPath(new URL("./public", import.meta.url)) },
      // 推荐同时配置别名（可选）
      { find: "@common", replacement: path.resolve(__dirname, '../common-components/src') },
      // 强制将 Node 端的 'ws'（含子路径）指向浏览器 stub
      { find: /^ws(\/.*)?$/, replacement: path.resolve(__dirname, 'src/shims/ws.ts') },
      // 强制将 'mqtt'（含子路径）指向浏览器 stub
      { find: /^mqtt(\/.*)?$/, replacement: path.resolve(__dirname, 'src/shims/mqtt.ts') },
      // 将 Node 的 'stream' 指到浏览器实现，避免 Writable 未定义
      { find: /^stream(\/.*)?$/, replacement: 'readable-stream' },
    ],
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    exclude: ['ws', 'mqtt', 'buffer']
  },
  base: mode === "test" ? "/test/UAVIP/" : "/UAVIP/",
  build: {
    outDir: mode === "test" ? 'UAVIP-test' : 'UAVIP',
    assetsDir: "assets",
    // 使用 esbuild 压缩以避免某些三方库在 terser 下的初始化时序问题
    minify: 'esbuild',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    assetsInlineLimit: 14336,
    chunkSizeWarningLimit: 500,
    // 默认 chunking + 手动分离大库，减小入口 index-*.js
    rollupOptions: {
      // 进一步确保 Node-only 包不被打进浏览器产物
      external: ['ws', 'mqtt'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) return 'element-plus';
            if (id.includes('@element-plus/icons-vue')) return 'ep-icons';
            if (id.includes('echarts')) return 'echarts';
            if (id.includes('pinia') || id.includes('vue-router')) return 'vue-state';
            if (id.includes('lodash')) return 'lodash';
            if (id.includes('common-components') || id.includes('my-vue-library')) return 'my-lib';
            return 'vendor';
          }
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      },
    },
  },
}));
