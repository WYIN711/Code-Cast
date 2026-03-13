# CodeCast — Agent 指引

> 每次开始工作前请阅读此文档。

## 1. 项目概述

CodeCast 是一个将 AI 编程会话（Claude Code / Codex）分享为网页的工具。

- **CLI** (`packages/cli`): 解析、脱敏、预览、上传会话
- **Web** (`packages/web`): Next.js 15 查看器 + API + GitHub OAuth
- **域名**: https://code-cast.dev
- **npm 包**: `codecast-cli` (v0.1.0)
- **GitHub**: https://github.com/WYIN711/Code-Cast

## 2. 生产环境

详见 `docs/DEPLOYMENT.md`，以下是关键信息：

| 资源 | 值 |
|------|-----|
| EC2 实例 | `i-0721ce2867bea300b` (t3.small, Ubuntu 24.04, ap-northeast-1) |
| Elastic IP | `18.178.65.171` |
| SSH 密钥 | `~/.ssh/codecast-key.pem` (用户 `ubuntu`) |
| AWS Profile | `binky` |
| Security Group | `sg-0df7f9221cb5443ed` (80, 443, 22) |
| Route 53 Hosted Zone | `Z03487632MHT8O57LP74Y` |
| EIP Allocation | `eipalloc-0e28d4638d3073571` |
| GitHub OAuth Client ID | `Ov23limPjYhpSuajEJO2` |

### SSH 连接

```bash
ssh -i ~/.ssh/codecast-key.pem ubuntu@18.178.65.171
```

### 服务器上的目录

```
/home/ubuntu/codecast/          # 项目代码（git clone）
/home/ubuntu/codecast/deploy/   # docker-compose.yml, Caddyfile, .env
```

### 常用运维命令

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs deploy-web-1 --tail 50
docker logs deploy-caddy-1 --tail 50

# 重新构建并部署
cd /home/ubuntu/codecast/deploy
docker compose up -d --build

# 仅重启
docker compose restart web
docker compose restart caddy

# 清除 Caddy SSL 证书缓存（如遇 TLS 问题）
docker compose down caddy
docker volume rm deploy_caddy_data deploy_caddy_config
docker compose up -d caddy

# 数据库在 Docker volume 中
docker volume inspect deploy_codecast_data
```

## 3. 技术架构

```
用户 → Caddy (443/80, 自动 HTTPS) → Next.js (3000) → SQLite (/data/sessions.db)
         ↑ Docker network: codecast
```

- **Caddy**: 反向代理 + Let's Encrypt 自动 SSL
- **Next.js 15**: standalone output, better-sqlite3 (WAL mode)
- **SQLite**: 持久化在 Docker volume `codecast_data` → 容器内 `/data/`
- **Auth**: NextAuth v5 beta.30, GitHub OAuth

## 4. 关键文件

| 文件 | 作用 |
|------|------|
| `packages/cli/src/index.ts` | CLI 入口，Commander.js 命令定义 |
| `packages/cli/src/parsers/` | Claude Code / Codex JSONL 解析器 |
| `packages/cli/src/redact/` | 敏感数据脱敏引擎 |
| `packages/cli/src/upload.ts` | 上传到服务器 |
| `packages/cli/src/auth.ts` | CLI 认证 (token 存 `~/.codecast/auth.json`) |
| `packages/web/src/lib/db.ts` | SQLite 数据库初始化 + schema |
| `packages/web/src/lib/auth.ts` | NextAuth 配置 + token 验证 |
| `packages/web/src/app/s/[id]/` | 会话查看页面 |
| `packages/web/src/app/api/share/` | 上传/删除 API |
| `packages/web/src/app/api/auth/cli-token/` | CLI 登录 OAuth 回调 |
| `deploy/docker-compose.yml` | 生产容器编排 |
| `deploy/Caddyfile` | Caddy 反向代理配置 |

## 5. 开发规范

- **Monorepo**: npm workspaces (`packages/cli`, `packages/web`)
- **CLI 构建**: tsup (ESM, shebang banner)
- **Web 构建**: `next build` → standalone output
- **环境变量**: 永远不提交 `.env`，只提交 `.env.example`
- **安全**:
  - CLI 的 `execFile()` 而非 `exec()`
  - Auth 文件权限 0o600
  - API 输入校验 (ID pattern, size limit, visibility enum)
  - CLI token 回调仅允许 localhost
  - DELETE 需要认证
  - Token 30 天过期

## 6. 部署流程

### 更新代码到生产

```bash
# 1. 本地推送到 GitHub
git push origin main

# 2. SSH 到服务器
ssh -i ~/.ssh/codecast-key.pem ubuntu@18.178.65.171

# 3. 拉取最新代码
cd /home/ubuntu/codecast && git pull

# 4. 重新构建并部署
cd deploy && docker compose up -d --build
```

### 发布 CLI 新版本

```bash
cd packages/cli
# 修改 package.json 中的 version
npm run build
npm publish
```

## 7. DNS 配置

- **注册商**: GoDaddy
- **NS**: 已迁移至 Route 53 (`ns-1076.awsdns-06.org` 等)
- **A 记录**: `code-cast.dev` → `18.178.65.171`
- **CNAME**: `www.code-cast.dev` → `code-cast.dev`
- **状态**: NS 传播中（2026-03-13 配置），部分 DNS 解析器已生效

## 8. 已知问题

- VPN/代理环境下可能因 DNS 缓存访问不到，需等 NS 完全传播或加直连规则
- next-auth 使用 beta 版 (5.0.0-beta.30)，稳定版发布后应升级
