# 浙外门训打卡 NAS 部署

这套配置用于把当前 `index.html` 部署到群晖 NAS / Docker / Container Manager。页面仍保留原来的 NocoDB 接口、成员名单、每日灵修、每日读经和周课功能。

## 文件说明

- `Dockerfile`：构建 Node.js 静态服务镜像。
- `docker-compose.yml`：群晖 Container Manager 可直接导入。
- `.env.example`：环境变量模板。
- `server.js`：提供静态页面、Markdown 文件访问和 `/health` 健康检查。
- `package.json`：Node.js 启动脚本和依赖。

## 群晖部署

1. 把整个项目目录上传到 NAS，例如：

   ```bash
   /volume2/docker/zw-checkin
   ```

2. 复制环境变量模板：

   ```bash
   cd /volume2/docker/zw-checkin
   cp .env.example .env
   ```

3. 如需修改端口，编辑 `.env`：

   ```env
   PORT=6717
   HOST=0.0.0.0
   STATIC_DIR=.
   NODE_ENV=production
   ```

4. 在群晖 Container Manager 中用“项目”方式导入 `docker-compose.yml`，或通过 SSH 执行：

   ```bash
   cd /volume2/docker/zw-checkin
   docker compose up -d --build
   ```

5. 启动后访问：

   ```text
   http://你的NAS地址:9717
   ```

## 维护命令

```bash
docker compose logs -f
docker compose restart
docker compose down
docker compose up -d --build
```

## 从 NocoDB 导入历史记录

`.env` 中需要有 NocoDB 地址和 token：

```env
NOCODB_API_URL=http://mouss.synology.me:32771/api/v2/tables/md6q8riiyslkw6p/records
NOCODB_API_TOKEN=你的NocoDBToken
DATA_DIR=./data
```

在 NAS 目录执行：

```bash
cd /volume2/docker/zw-checkin
docker compose run --rm --build zw-checkin npm run import:nocodb
docker compose up -d --build
```

导入完成后会生成：

```text
/volume2/docker/zw-checkin/data/records.json
/volume2/docker/zw-checkin/data/nocodb-import-meta.json
```

通过 `http://你的NAS地址:9717` 访问时，页面会优先读取 NAS 本地的 `/api/state` 数据；如果 NAS API 不可用，会回退读取原 NocoDB。

## 备份建议

当前页面的打卡数据仍写入原 NocoDB；后台里导出的 JSON/CSV 也建议定期保存。若之后要完全改成浙科那种 NAS JSON 后端，可以继续增加 `/api` 服务和迁移脚本。

## 路径提示

`docker-compose.yml` 里用的是相对路径挂载（例如 `./data`、`./Yonghuo.md`）。只要你在 `/volume2/docker/zw-checkin` 这个目录下启动项目（或在 Container Manager 中把项目目录指向这里），这些挂载会自动生效。
