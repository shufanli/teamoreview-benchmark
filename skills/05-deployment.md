# 部署技能

## 概述

将应用部署到腾讯云服务器，使用 Docker 容器化，通过 TAT（腾讯自动化助手）远程执行部署命令。

**重要：不要尝试 SSH。直接用 TAT。**

## 部署方案：Docker + TAT（唯一方案）

```
本地 Docker build → git push 代码到服务器 → TAT 远程执行 docker-compose up
```

### 什么是 TAT

TAT（TencentCloud Automation Tools）是腾讯云的远程命令执行服务。不需要 SSH，通过 API 直接在服务器上执行命令。

### 准备工作

1. 安装腾讯云 CLI：
```bash
pip install tccli
tccli configure  # 输入 SecretId + SecretKey
```

2. 获取 SecretId/SecretKey：
   - 用 .env.dev 中的子账号登录 https://cloud.tencent.com/login/subAccount
   - 进入 https://console.cloud.tencent.com/cam/capi 创建 API 密钥

### 部署步骤

#### Step 1: 在服务器上执行命令（通过 TAT）

```bash
# 在服务器上执行任意命令
tccli tat RunCommand \
  --InstanceIds '["ins-5ee3ymo2"]' \
  --Content "$(echo -n 'cd /home/work && git clone <repo> && docker-compose up -d' | base64)" \
  --CommandType SHELL \
  --Timeout 600 \
  --Region ap-hongkong
```

#### Step 2: 查看执行结果

```bash
# 查看命令执行状态
tccli tat DescribeInvocations \
  --InvocationIds '["inv-xxxxx"]' \
  --Region ap-hongkong
```

#### Step 3: 完整部署流程

```bash
# 1. 本地构建并推送代码（或直接在服务器上 git pull）
# 2. 通过 TAT 在服务器上执行：
DEPLOY_CMD="cd /home/work/clawschool && git pull && docker-compose down && docker-compose build && docker-compose up -d"

tccli tat RunCommand \
  --InstanceIds '["ins-5ee3ymo2"]' \
  --Content "$(echo -n "$DEPLOY_CMD" | base64)" \
  --CommandType SHELL \
  --Timeout 600 \
  --Region ap-hongkong

# 3. 验证部署
tccli tat RunCommand \
  --InstanceIds '["ins-5ee3ymo2"]' \
  --Content "$(echo -n 'curl -s http://localhost:3000 | head -20 && curl -s http://localhost:8000/docs | head -20' | base64)" \
  --CommandType SHELL \
  --Timeout 30 \
  --Region ap-hongkong
```

### 首次部署（Hello World）

**部署应该是第一天的事，不是最后一步。** 第一个 commit 就应该部署一个空的 Hello World 到服务器：

```bash
# 1. 先读服务器上的现有架构
tccli tat RunCommand \
  --InstanceIds '["ins-5ee3ymo2"]' \
  --Content "$(echo -n 'ls -la /home/work/ && cat /home/work/docker-compose.yml 2>/dev/null || echo "no docker-compose"' | base64)" \
  --CommandType SHELL \
  --Timeout 30 \
  --Region ap-hongkong

# 2. 部署空项目验证流程通
# 3. 之后每个功能增量部署
```

## 需要的 Skills

### ClawHub Skills（需安装）

| Skill | 安装命令 | 下载量 | 说明 |
|-------|---------|--------|------|
| **Docker** | `npx clawhub@latest install ivangdavila/docker` | 7,922 | Dockerfile + Compose + 安全加固 |

### Claude Code 内置 Skills

| Skill | 命令 | 说明 |
|-------|------|------|
| Canary | `/canary` | 上线后健康监控 |

## 域名配置

```
生产: clawschooldev.teamolab.com
开发: clawschooldev.teamolab.com
```

通过腾讯云 DNS 控制台或 tccli 配置 A 记录。也可以用 TAT 在服务器上配 Nginx + Let's Encrypt。

## 关键原则

1. **不要尝试 SSH** — 直接用 TAT，省去 SSH 连通性问题
2. **第一天就部署** — 先部署空项目，之后增量更新
3. **容器化** — 用 Docker，不要裸跑
4. **HTTPS** — Let's Encrypt 自动续签
5. **健康检查** — 部署后用 TAT 执行 curl 验证 + `/canary` 监控

## 需要人类提供的资源

- [x] 腾讯云子账号（已在 .env.dev 中）
- [ ] API SecretId + SecretKey（用子账号登录后自行创建）
- [ ] 域名 DNS 管理权限

## 状态：✅ 可用，Agent 自行获取 API 密钥即可开始部署
