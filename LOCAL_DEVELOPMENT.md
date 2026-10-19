# 本地前后端联调（guoke 分支）

前端：`D:\OpenGA1013\spatiotemporal-intelligence-web`，本地分支 `guoke`。

智能体后端：`D:\OpenGA1013\whulri-agent\oge-agent`，所属仓库本地分支 `guoke`。

## 启动

分别在两个 PowerShell 窗口运行，保留窗口以查看日志；停止时在对应窗口按 Ctrl+C。

后端：

```powershell
cd D:\OpenGA1013\whulri-agent
.\start-backend.ps1
```

前端：

```powershell
cd D:\OpenGA1013\spatiotemporal-intelligence-web
.\start-local.ps1
```

打开 <http://127.0.0.1:9000/UAVIP/>。后端健康检查 <http://127.0.0.1:8000/health>。
端口已占用时先检查原服务，不要重复启动。

## 登录和连接

1. 先用一网统飞平台账号登录页面。
2. 打开“低空智飞助手”面板即可使用，不再单独登录 OGA。
3. 智能体请求复用平台原有的 Bearer Token。后端调用同一平台的 `/system/user/getInfo` 校验身份，不解码后直接信任，也不关闭认证。令牌失效时重新登录平台。

`npm run dev:local` 使用 `cb` 平台配置；平台业务仍连接现有 `http://223.75.173.128:19500`，并非把飞控平台全部部署在本机。智能体 `/ai` 代理转到本机 `8000`。平台任务、航线、设备操作会影响真实平台，首次验证请使用查询或身份介绍。

本机 `.env.cb.local` 已配置并被 Git 忽略。换电脑时：

```powershell
Copy-Item .env.cb.local.example .env.cb.local
npm.cmd ci
```

其中 `AGENT_PROXY_TARGET` 是 Vite 服务端配置。VITE_ 开头的变量会发送到浏览器，不能放模型密钥。未配置本地代理变量时保留原远程代理。

后端本机私有 `.env` 已配置：

```dotenv
OGE_AGENT_AUTH_PROVIDER=flight_platform
OGE_AGENT_FLIGHT_AUTH_BASE_URL=http://223.75.173.128:19500
```

更新后需在后端终端按 Ctrl+C，再运行 `start-backend.ps1`。这两项可配置到服务器自己的环境中；不携带用户密码。未配置时后端默认保留 OGA 模式以兼容原 OpenGA。平台账号的会话 ID 按 `flight:<平台用户ID>` 隔离，原 OGA 对话不会自动迁移。平台模式使用后端配置的模型；不访问 OGA 个人额度或绑定账号服务。

后端继续使用原私有 `.env` 和 Windows 中已有的模型配置，不要把它们提交 Git。后端启动脚本保留系统中已有的非空密钥，不会用 `.env` 的空值覆盖。

## 验证结果与限制

- 2026-10-19：依赖安装、`npm run build-only:cb` 通过。
- 前端页面、智能体面板组件编译返回 200；本地后端健康检查 200；经前端代理访问受保护接口，未登录返回 401，认证保持开启。
- 已看到平台登录页；真实平台账号登录后的完整业务流程需本人在页面验证，未执行真实飞行任务。
- `npm run type-check` 尚未通过：仓库已有业务组件、地图和类型声明报错；本次新增登录组件及认证文件未出现类型错误。打包通过不代表完整类型检查通过。
- 平台令牌验证测试位于后端 `tests/test_flight_platform_auth.py`；使用模拟平台响应，不执行飞行操作。
- 改为平台认证后，平台认证、OGA 兼容及本地环境加载共 21 项测试通过；扩大检查时，原有 `test_graph_checkpoint_resume_after_clarification` 未通过（模拟无模型时返回 finished，原断言要求 need_clarification），未修改该业务流程。

## 后续开发

智能体机场地图定位已接入；功能规则、只读接口和验收步骤见 [机场地图联动说明](docs/AIRPORT_MAP_FOCUS.md)。更新此功能后需要重启后端，再刷新前端。

两个仓库分别检查 `git branch --show-current`，均应为 `guoke`。分别提交、推送，互不替代。

不要直接合并 `main` 或覆盖私有配置。原 React 前端仍保留，新前端使用 9000 端口。
