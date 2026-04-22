# 2026 门训打卡

这是一个面向门训小组的每日打卡网页，包含每日灵修、每日读经、周课任务、人物月历、数据中心统计和管理员后台。项目可以直接作为静态页面打开，也可以部署到 NAS / Docker 上，通过本地 JSON 数据缓存和 NocoDB 导入脚本维护历史记录。

## 功能

- 每日灵修：读取 `Yonghuo.md`，按日期打开对应内容。
- 周课任务：读取 `weekly_task.md`，按管理员后台配置的周计划展示。
- 成员打卡：支持每日灵修、每日读经、周课完成状态。
- 人物月历：点击成员头像查看个人月度完成情况。
- 数据中心：提供总打卡榜、近七日活跃、连续天数和周总结。
- 管理员后台：维护成员、周计划、导出 CSV/JSON、本地备份导入。
- NAS 部署：内置 `Dockerfile`、`docker-compose.yml`、`server.js`。
- NocoDB 导入：通过 `migrate-nocodb.js` 将历史记录导入 `data/records.json`。

## 文件说明

- `index.html`：主页面和前端逻辑。
- `Yonghuo.md`：每日灵修内容，日期标题需保持 `### 一月一日 标题` 格式。
- `weekly_task.md`：周课阅读内容。
- `server.js`：NAS / Docker 静态服务和 `/api/state` 接口。
- `migrate-nocodb.js`：从 NocoDB 导入历史记录。
- `docker-compose.yml`：NAS Docker Compose 配置。
- `.env.example`：环境变量模板。
- `README_NAS.md`：NAS 部署补充说明。
- `icon_ios_v2.png`：网页图标。

## 本地使用

最简单的方式是直接打开：

```text
index.html
```

如果要使用本地服务方式运行：

```bash
npm install
npm start
```

默认服务端口由 `.env` 中的 `PORT` 控制，当前容器内端口建议为 `6717`。

## NAS 部署

推荐在群晖 NAS 中使用以下路径：

```bash
/volume2/docker/zw-checkin
```

部署步骤：

```bash
cd /volume2/docker/zw-checkin
cp .env.example .env
docker compose up -d --build
```

访问地址：

```text
http://你的NAS地址:9717
```

端口说明：

- 外部访问端口：`9717`
- 容器内部端口：`6717`

如果容器名冲突，当前 `docker-compose.yml` 没有固定 `container_name`，通常重新用 compose 项目启动即可避免占用旧容器名。

## 从 NocoDB 导入记录

先在 `.env` 中配置：

```env
NOCODB_API_URL=http://mouss.synology.me:32771/api/v2/tables/md6q8riiyslkw6p/records
NOCODB_API_TOKEN=你的NocoDBToken
DATA_DIR=./data
```

然后执行：

```bash
docker compose run --rm --build zw-checkin npm run import:nocodb
docker compose up -d --build
```

导入后会生成：

```text
data/records.json
data/nocodb-import-meta.json
```

部署在 NAS 上访问时，页面会优先读取 `/api/state` 中的本地记录；如果本地 API 不可用，会回退到原来的 NocoDB 接口。

## 内容格式约定

`Yonghuo.md` 的每日标题必须使用三级标题：

```markdown
### 一月一日 一天新似一天
```

`index.html` 会按当前选择日期生成类似 `四月二十二日` 的标题进行匹配，所以日期文字要使用 `二十、二十一、三十、三十一` 这种格式，不要使用 `廿、卅`。

## 维护命令

```bash
docker compose logs -f
docker compose restart
docker compose down
docker compose up -d --build
```

## 备份建议

建议定期在管理员后台导出 JSON 和 CSV。若 NAS 使用本地 JSON 记录，也建议定期备份 `data/records.json`。
