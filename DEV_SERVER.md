# 开发服务器启动说明

## 后端 (FastAPI)

```bash
cd backend
pip3 install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --root-path /teamoreview --reload
```

后端运行在 `http://localhost:8000`，API 前缀 `/api/`。

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/test/start` | 创建测试，返回 token + 题目 + 命令 |
| POST | `/api/test/submit` | 提交答案，返回评分结果 |
| GET | `/api/test/status/{token}` | 轮询测试状态 |
| GET | `/api/test/result/{token}` | 获取完整测试结果 |
| GET | `/api/leaderboard` | 排行榜数据 |
| GET | `/skill.md?token={token}` | 动态生成 SKILL.md |

## 前端 (Next.js)

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:3000/teamoreview`（basePath 已配置为 `/teamoreview`）。

开发模式下，前端通过 Next.js rewrites 将 `/api/*` 请求代理到 `http://localhost:8000/api/*`。

## 同时启动

```bash
# Terminal 1: 后端
cd backend && python3 -m uvicorn app.main:app --port 8000 --root-path /teamoreview --reload

# Terminal 2: 前端
cd frontend && npm run dev
```

然后访问 `http://localhost:3000/teamoreview`。

## 注意事项

- 需要 Python 3.9+ 和 Node.js 18+
- SQLite 数据库文件在 `backend/data/lobster.db`，自动创建
- 如果本地有 HTTP 代理（如 clash），curl 测试时加 `--noproxy '*'`
