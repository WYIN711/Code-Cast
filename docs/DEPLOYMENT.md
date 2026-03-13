# CodeCast 生产部署文档

## 基础设施概览

| 组件 | 详情 |
|------|------|
| **云服务商** | AWS (ap-northeast-1, Tokyo) |
| **AWS Profile** | `binky` |
| **EC2 实例** | `i-0721ce2867bea300b`, t3.small, Ubuntu 24.04 LTS |
| **Elastic IP** | `18.178.65.171` (Allocation: `eipalloc-0e28d4638d3073571`) |
| **Security Group** | `sg-0df7f9221cb5443ed` — 入站: 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| **SSH Key Pair** | `codecast-key` → 本地 `~/.ssh/codecast-key.pem` |
| **域名** | `code-cast.dev` (注册商: GoDaddy) |
| **DNS** | Route 53 Hosted Zone `Z03487632MHT8O57LP74Y` |
| **SSL** | Caddy 自动管理 (Let's Encrypt) |

## 架构图

```
                    ┌─────────────────────────────────────┐
                    │  EC2: i-0721ce2867bea300b            │
                    │  Ubuntu 24.04 / t3.small             │
                    │  IP: 18.178.65.171                   │
                    │                                      │
  Internet ──────►  │  ┌──────────────────────┐            │
  (code-cast.dev)   │  │ Caddy (443/80)       │            │
                    │  │ - Auto HTTPS         │            │
                    │  │ - Let's Encrypt      │            │
                    │  └──────────┬───────────┘            │
                    │             │ reverse_proxy           │
                    │  ┌──────────▼───────────┐            │
                    │  │ Next.js (3000)       │            │
                    │  │ - standalone mode    │            │
                    │  │ - NextAuth v5       │            │
                    │  └──────────┬───────────┘            │
                    │             │                         │
                    │  ┌──────────▼───────────┐            │
                    │  │ SQLite (WAL mode)    │            │
                    │  │ /data/sessions.db    │            │
                    │  │ Docker volume        │            │
                    │  └──────────────────────┘            │
                    └─────────────────────────────────────┘
```

## DNS 记录

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| A | `code-cast.dev` | `18.178.65.171` | 300 |
| CNAME | `www.code-cast.dev` | `code-cast.dev` | 300 |
| NS | `code-cast.dev` | `ns-1076.awsdns-06.org`, `ns-1872.awsdns-42.co.uk`, `ns-411.awsdns-51.com`, `ns-938.awsdns-53.net` | 172800 |

### Route 53 管理命令

```bash
# 查看所有记录
aws route53 list-resource-record-sets --hosted-zone-id Z03487632MHT8O57LP74Y --profile binky

# 添加/修改记录
aws route53 change-resource-record-sets --hosted-zone-id Z03487632MHT8O57LP74Y --profile binky \
  --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"code-cast.dev","Type":"A","TTL":300,"ResourceRecords":[{"Value":"18.178.65.171"}]}}]}'
```

## Docker 容器

| 容器 | 镜像 | 端口 | Volume |
|------|------|------|--------|
| `deploy-web-1` | `deploy-web` (自构建) | 3000 (内部) | `codecast_data:/data` |
| `deploy-caddy-1` | `caddy:2-alpine` | 80, 443 (外部) | `caddy_data:/data`, `caddy_config:/config` |

### Docker 网络

容器通过 `codecast` bridge 网络通信，Caddy 通过 `web:3000` 访问 Next.js。

## GitHub OAuth

| 项目 | 值 |
|------|-----|
| OAuth App 名称 | CodeCast |
| Client ID | `Ov23limPjYhpSuajEJO2` |
| Homepage URL | `https://code-cast.dev` |
| Callback URL | `https://code-cast.dev/api/auth/callback/github` |

Client Secret 和 NEXTAUTH_SECRET 存储在服务器 `deploy/.env` 中，不在代码仓库中。

## 环境变量 (deploy/.env)

```bash
GITHUB_CLIENT_ID=Ov23limPjYhpSuajEJO2
GITHUB_CLIENT_SECRET=<secret>          # GitHub OAuth App Secret
NEXTAUTH_SECRET=<secret>               # openssl rand -base64 32
```

`docker-compose.yml` 额外设置:
- `DB_PATH=/data/sessions.db`
- `NODE_ENV=production`
- `NEXTAUTH_URL=https://code-cast.dev`

## SSH 连接

```bash
ssh -i ~/.ssh/codecast-key.pem ubuntu@18.178.65.171
```

## 服务器目录结构

```
/home/ubuntu/
└── codecast/                  # git clone of Code-Cast
    ├── packages/
    │   ├── cli/
    │   └── web/
    └── deploy/
        ├── docker-compose.yml
        ├── Caddyfile
        ├── .env               # 生产环境变量 (不在 git 中)
        ├── .env.example
        ├── setup.sh
        └── user-data.sh
```

## 常用运维操作

### 查看状态

```bash
# 容器状态
docker ps

# Web 日志
docker logs deploy-web-1 --tail 50 -f

# Caddy 日志
docker logs deploy-caddy-1 --tail 50 -f

# 健康检查（从服务器内部）
docker exec deploy-web-1 node -e "fetch('http://localhost:3000/api/health').then(r=>r.text()).then(console.log)"
```

### 部署更新

```bash
cd /home/ubuntu/codecast
git pull origin main
cd deploy
docker compose up -d --build
```

### 仅重启（不重新构建）

```bash
cd /home/ubuntu/codecast/deploy
docker compose restart web      # 重启 Next.js
docker compose restart caddy    # 重启 Caddy
```

### 重新获取 SSL 证书

如遇 TLS 错误，清除 Caddy 证书缓存：

```bash
cd /home/ubuntu/codecast/deploy
docker compose down caddy
docker volume rm deploy_caddy_data deploy_caddy_config
docker compose up -d caddy
# Caddy 会自动重新申请 Let's Encrypt 证书
```

### 数据库备份

```bash
# 从 Docker volume 复制数据库
docker cp deploy-web-1:/data/sessions.db ./sessions-backup.db

# 或挂载 volume 检查
docker run --rm -v deploy_codecast_data:/data alpine ls -la /data/
```

### 查看数据库内容

```bash
docker cp deploy-web-1:/data/sessions.db /tmp/sessions.db
sqlite3 /tmp/sessions.db "SELECT id, visibility, created_at, view_count FROM sessions ORDER BY created_at DESC LIMIT 10;"
sqlite3 /tmp/sessions.db "SELECT id, username, display_name FROM users;"
```

## npm 发布 (CLI)

- **包名**: `codecast-cli`
- **npm 用户**: `wyin711`
- **当前版本**: `0.1.0`

```bash
cd packages/cli
# 修改 package.json version
npm run build
npm publish
```

需要 npm granular access token（不支持 classic token）。

## 安全检查清单

- [ ] `deploy/.env` 不在 git 中（`.gitignore` 已配置）
- [ ] SSH key (`~/.ssh/codecast-key.pem`) 权限 600
- [ ] Security Group 只开放 22, 80, 443
- [ ] GitHub OAuth callback 只允许 `code-cast.dev`
- [ ] CLI token 回调只允许 localhost
- [ ] API DELETE 需要认证
- [ ] auth_tokens 30 天过期

## 故障排查

| 问题 | 排查步骤 |
|------|----------|
| 网站打不开 | `ssh` 上去 → `docker ps` 看容器是否运行 → `docker logs` 查日志 |
| SSL 错误 | 清除 Caddy 证书缓存并重启（见上方） |
| 数据库锁 | 检查是否有多个进程写入 → `docker restart deploy-web-1` |
| DNS 不生效 | `dig @8.8.8.8 code-cast.dev` 查全球 DNS → 检查 Route 53 记录 |
| OAuth 失败 | 确认 `NEXTAUTH_URL` 和 GitHub OAuth callback URL 一致 |
| CLI 上传失败 | 检查 `--server` 参数 → `curl https://code-cast.dev/api/health` |

## 配置时间线

- **2026-03-13**: 初始部署
  - EC2 + Elastic IP 创建
  - Route 53 hosted zone 创建，NS 从 GoDaddy 迁移
  - Docker Compose (Caddy + Next.js) 部署
  - GitHub OAuth App 创建
  - Let's Encrypt 生产证书签发成功
  - CLI v0.1.0 发布到 npm
