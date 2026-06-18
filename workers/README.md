# Sync Worker (Cloudflare)

Proxy đọc/ghi `data/state.json` — **GitHub token và mã ghi chỉ nằm trên Worker**, không commit vào repo.

## Secrets bắt buộc

```bash
cd workers
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put WRITE_KEY
npx wrangler deploy
```

Khi được hỏi, dán **GitHub token** và nhập mã nhóm **`fc-mobile-cup`** (WRITE_KEY).

**Lưu ý:** Không gõ comment `# ...` trên cùng dòng — shell sẽ báo lỗi `Unknown arguments`.

| Secret | Mô tả |
|--------|--------|
| `GITHUB_TOKEN` | **Classic token**, tick **`repo`** (full). Fine-grained hay lỗi *Resource not accessible* |
| `WRITE_KEY` | Mã nhóm — nhập `fc-mobile-cup` (trùng `SYNC_WRITE_KEY_DEFAULT` trong app) |

**Không** đưa `GITHUB_TOKEN` hay `WRITE_KEY` vào `index.html`, `state.json`, hoặc git.

## CORS

Chỉ cho phép:

- `https://luan20495.github.io`
- `http://localhost:8765`
- `http://127.0.0.1:8765`

Thêm origin tùy chọn qua biến Worker `ALLOWED_ORIGINS` (phân cách bằng dấu phẩy).

## API

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/state` | Không | Đọc state (CORS origin hợp lệ) |
| POST | `/state` | `X-Sync-Key: <WRITE_KEY>` | Ghi state lên `main` |

Body POST:

```json
{
  "state": { ... },
  "clientId": "...",
  "updatedAt": "...",
  "baseUpdatedAt": "..."
}
```

- **400** — JSON/state không hợp lệ hoặc > 1MB
- **401** — thiếu/sai `X-Sync-Key`
- **409** — `baseUpdatedAt` khác server → `{ error: "conflict", serverUpdatedAt, serverState }`

## Cấu hình web (mỗi máy)

**Không cần cấu hình** — app tự dùng Worker mặc định + mã nhóm `fc-mobile-cup`.

Chỉ mở **Cài đặt nâng cao** nếu dùng server riêng (ghi đè URL / mã lưu).

Lưu tùy chọn trong `localStorage` (`fc-mobile-sync-api-url`, `fc-mobile-sync-key`).

## Dev local

Terminal 1 — web:

```bash
python3 -m http.server 8765
```

Terminal 2 — worker:

```bash
cd workers
npx wrangler secret put GITHUB_TOKEN   # lần đầu
npx wrangler secret put WRITE_KEY
npx wrangler dev
```

Trong app, URL Sync API = `http://localhost:8787` (port mặc định wrangler dev).

## Test curl

```bash
# GET (không cần key)
curl -H "Origin: http://localhost:8765" http://localhost:8787/state

# POST không key → 401
curl -X POST -H "Origin: http://localhost:8765" -H "Content-Type: application/json" \
  -d '{"state":{}}' http://localhost:8787/state

# POST đúng key (thay YOUR_KEY)
curl -X POST -H "Origin: http://localhost:8765" \
  -H "Content-Type: application/json" -H "X-Sync-Key: YOUR_KEY" \
  -d @payload.json http://localhost:8787/state
```

## Luồng multi-device

1. Mọi máy đọc state (GET hoặc file tĩnh trên Pages).
2. Mọi máy ghi qua POST Worker + mã lưu.
3. Polling 10s; nếu đang sửa dở (dirty) thì không tự ghi đè — báo và bấm **Tải lại**.
