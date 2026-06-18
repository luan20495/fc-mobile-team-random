# FC Mobile Cup — Báo cáo vận hành & bàn giao

> **Tên sản phẩm chính thức:** `FC Mobile Cup`  
> **Tên cũ (đã đổi):** `FC Mobile Random Cup` — chỉ còn trong lịch sử commit, không dùng trên UI.  
> **Lưu ý:** `Random Cup` là **tên tính năng/tab/chế độ giải**, không phải tên app. Schema/code internal `randomCup` **giữ nguyên** để tránh migration.

---

## 1. Tổng quan sản phẩm

**FC Mobile Cup** là web app chạy trên **GitHub Pages**, dùng cho nhóm bạn chơi FC Mobile:

- Nhập người chơi
- Random đội tuyển (World Cup 2026 API hoặc cache)
- Bắt cặp **1v1** hoặc **NvN** (2v2 … 5v5)
- Tạo giải mini (**Random Cup**, **Giải Nhất Nhì**)
- Nhập kết quả, xem bracket
- Lưu lịch sử, thống kê cá nhân
- Đồng bộ nhiều thiết bị qua Cloudflare Worker

**Đặc điểm kỹ thuật:**

- Single-page app (SPA) thuần — **không framework**, **không build step**
- File chính: `index.html` (~4000 dòng HTML/CSS/JS)
- Dữ liệu dùng chung: `data/state.json` (schema v2)

**Mục tiêu UI/UX:**

| Nguyên tắc | Thực hiện |
|------------|-----------|
| Tối giản, đẹp, dễ hiểu | Header gọn, 1–2 CTA chính mỗi màn |
| Ít thao tác | Luồng: nhập người → chọn mode → Random → nhập kết quả |
| Nhiều tính năng nhưng không rối | Lịch sử giải cũ, backup, sync trong **Cài đặt nâng cao** (đóng mặc định) |
| Người không rành kỹ thuật | Không hiện PAT, Worker, schema, conflict trên màn chính |

---

## 2. Kiến trúc tổng thể

```text
Nhiều thiết bị / người dùng
        │
        ▼
GitHub Pages frontend  (index.html)
        │
        ├── Đọc công khai: data/state.json  (raw GitHub hoặc qua Worker GET)
        │
        └── Ghi dữ liệu: POST {SYNC_API_URL}/state
                    │          Header: X-Sync-Key
                    ▼
            Cloudflare Worker  (workers/sync-worker.js)
            Secrets:
            - GITHUB_TOKEN
            - WRITE_KEY
                    │
                    ▼
            Commit data/state.json lên branch main

Backup thủ công (tùy chọn):
.github/workflows/save-state.yml  →  workflow_dispatch  →  commit state
```

**Vai trò từng thành phần:**

| Thành phần | Vai trò |
|------------|---------|
| `index.html` | UI + toàn bộ logic app |
| `data/state.json` | Database JSON dùng chung trên repo |
| `workers/sync-worker.js` | API proxy GET/POST `/state`, ghi qua GitHub Contents API |
| `workers/wrangler.toml` | Cấu hình Worker (`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`) |
| `workers/README.md` | Hướng dẫn deploy Worker, secrets, test curl |
| `.github/workflows/save-state.yml` | Backup: nhập JSON qua `workflow_dispatch`, commit lên `main` |
| `assets/icons/*` | Logo, favicon, icon PWA |
| `manifest.webmanifest` | Cấu hình install/PWA (standalone) |
| `AGENT_HANDOFF.md` | Tài liệu bàn giao kỹ thuật cho agent (bổ sung) |

---

## 3. Danh sách file chính

| File | Vai trò |
|------|---------|
| `index.html` | App chính: UI, random, giải đấu, thống kê, sync |
| `data/state.json` | Database JSON dùng chung, schema v2 |
| `workers/sync-worker.js` | Cloudflare Worker GET/POST `/state` |
| `workers/wrangler.toml` | Cấu hình deploy Worker |
| `workers/README.md` | Hướng dẫn deploy Worker |
| `.github/workflows/save-state.yml` | Backup workflow dispatch |
| `assets/icons/favicon.svg` | Favicon SVG |
| `assets/icons/favicon-32.png` | Favicon PNG 32×32 |
| `assets/icons/favicon-192.png` | Icon PWA 192×192 |
| `assets/icons/apple-touch-icon.png` | Icon iOS 180×180 |
| `assets/icons/logo.svg` | Logo ngang (mark + wordmark) |
| `assets/icons/logo-mark.svg` | Icon mark dùng trong header |
| `manifest.webmanifest` | Cấu hình install/PWA |
| `scripts/render-icons.mjs` | Script render PNG từ SVG (`npm run icons`) |
| `package.json` | Dev dependency `@resvg/resvg-js` (chỉ để render icon) |
| `README.md` | Giới thiệu ngắn |
| `AGENT_HANDOFF.md` | Handoff chi tiết cho agent |
| `PROJECT_REPORT.md` | Báo cáo vận hành này |

---

## 4. UI/UX hiện tại

### 4.1 Header / Branding

- **Tên app:** `FC Mobile Cup`
- **Logo:** `assets/icons/logo-mark.svg` trong card bo góc, glow nhẹ
- **Subtitle:** `Bắt đội nhanh · Random Cup · Thống kê nhiều máy`
- **Footer:** trạng thái sync đơn giản (không badge kỹ thuật trên header)
- **Mobile:** logo ~38px, header thấp, không vỡ layout

**Meta / PWA:**

```html
<title>FC Mobile Cup</title>
<meta name="application-name" content="FC Mobile Cup">
<meta name="apple-mobile-web-app-title" content="FC Cup">
<meta name="theme-color" content="#07111f">
```

### 4.2 Navigation

| Tab | `data-view` | Mô tả ngắn |
|-----|-------------|------------|
| Bắt đội | `shuffle` | Random chia đội nhanh |
| Random Cup | `randomcup` | Giải loại trực tiếp nhánh thắng/thua |
| Giải Nhất Nhì | `tournament` | Vòng tròn + playoff |
| Lịch sử | `profile` | Lịch sử cá nhân theo tên |
| Thống kê | `stats` | Bảng thống kê Random Cup |

Nguyên tắc: tab rõ ràng, không thuật ngữ kỹ thuật, màn chính chỉ thao tác quan trọng.

### 4.3 Tab Bắt Đội

- Nhập/xóa người chơi bằng **chip**
- Chế độ:
  - **Chia 2 đội** (`split`)
  - **1v1, 2v2, 3v3, 4v4, 5v5** (`nvn` + `teamSize`)
- **Random** — chia người + gán đội tuyển WC
- Mode **disable** khi không đủ người; `title` tooltip giải thích
- Lịch sử trong `<details>` thu gọn — tối đa **20** bản ghi trong `shuffleHistory`
- Mỗi bản ghi có metadata: `createdAt`, `mode`, `players`, snapshot teams

### 4.4 Tab Random Cup

> Đây là **tên chế độ giải**, không phải tên app.

- Tạo giải: tên giải (key), chế độ **1v1** / **NvN**, số người/đội
- Tùy chọn: **Đổi đội tuyển mỗi vòng**
- CTA chính: **Tạo giải** (nút xanh, full width)
- Khi giải đang chạy: ẩn form setup, hiện bracket + trận
- Modal nhập tỉ số + quick score: **2-0, 2-1, 1-0, 3-2**
- Nút chọn bên thắng (cup modal)
- Nhánh **thắng** / **thua**; card **Miễn đấu vòng này** khi bye
- Banner **vô địch** + pill trạng thái Thắng/Thua/Chờ
- Lịch sử giải cũ trong `<details>` — lọc Tất cả / Đang chơi / Đã xong, tìm theo tên

### 4.5 Tab Giải Nhất Nhì

- Vòng tròn (thắng 3, hòa 1 điểm)
- Playoff: Nhất vs Nhì, Ba vs Tư
- Sơ đồ FC Mobile style (`fc-*` CSS)
- Sửa tỉ số có confirm
- Dữ liệu `tournament` **tách biệt** `randomCup` — không ảnh hưởng lẫn nhau

### 4.6 Tab Lịch sử

- Xem lịch sử **theo tên người chơi**
- Chip nhanh + ô tìm tên
- Hiển thị giải Nhất Nhì + Random Cup đã tham gia
- Bracket read-only khi xem từ profile

### 4.7 Tab Thống kê

Tính từ `recomputePlayerStats()`:

| Cột | Ý nghĩa |
|-----|---------|
| Giải | Số giải Random Cup đã tham gia (done/saved) |
| Thắng / Thua | Từ các trận completed |
| Tỉ lệ | `wins / (wins + losses)` |
| Vô địch | Số lần champion |
| ĐTQG hay dùng | Đội tuyển thắng nhiều nhất |

Mobile: bảng chuyển dạng card.

### 4.8 Cài đặt nâng cao

`<details>` đóng mặc định — **⚙️ Cài đặt nâng cao**

| Khối | Nội dung |
|------|----------|
| Đồng bộ dữ liệu | Địa chỉ đồng bộ + Mã lưu dữ liệu + Lưu + Tải lại |
| Chia sẻ app | Copy link GitHub Pages |
| Sao lưu | Tải backup JSON (`fc-mobile-cup-backup-YYYY-MM-DD.json`) |

**localStorage keys:**

| Key | Mục đích |
|-----|----------|
| `fc-mobile-sync-api-url` | URL Worker |
| `fc-mobile-sync-key` | Mã ghi (`X-Sync-Key`) |
| `fc-mobile-client-id` | ID thiết bị (conflict tracking) |
| `fc-mobile-gh-token` | Legacy PAT fallback (ẩn, không khuyến khích) |

**Text người dùng (footer / toast):**

| Hiển thị | Ý nghĩa |
|----------|---------|
| `Đang tải...` | Đang fetch state |
| `Đang lưu...` | Đang POST |
| `Đã lưu ✓` | Lưu / đồng bộ OK |
| `Chưa lưu được` | Không ghi được |
| `Có dữ liệu mới · Tải lại` | Remote mới hơn, local dirty hoặc conflict |
| Toast: `Có dữ liệu mới, bấm tải lại` | Hướng dẫn user |

**Không dùng trên màn chính:** PAT, schema, worker, conflict, dispatch, token GitHub.

---

## 5. Logic Bắt Đội nhanh

1. User nhập `players[]`
2. Chọn `mode` + `teamSize` (nếu nvn)
3. `getSplit()` shuffle + chia cặp/đội
4. `assignTeams()` gán đội tuyển từ `NATIONAL_TEAMS` (API hoặc cache)
5. Push vào `shuffleHistory`, gọi `scheduleSaveToGithub()`

**Mode:**

```text
split   → chia 2 đội (ceil/ floor)
nvn 1   → 1v1 (nhiều cặp)
nvn 2–5 → 2v2 … 5v5
```

**Validation:**

- `n < 2` → không random
- NvN: cần `n >= teamSize * 2` cho ít nhất 1 trận; dư người → **dự bị** (`bench`)

---

## 6. Logic Random Cup

### 6.1 Competitor

```text
1v1:  mỗi người = 1 competitor (type: "solo")
NvN:  mỗi team N người = 1 competitor (type: "team", name: "A · B · C")
```

```js
{
  id: string,
  type: "solo" | "team",
  name: string,
  members: string[],
  country: { name: string, flag: string }
}
```

### 6.2 Tạo giải (`startRandomCup`)

1. Lấy `players` hiện tại
2. `buildCompetitorsFromPlayers()` — shuffle, ghép team, dư → `bench`
3. Ghép cặp round 0 → `rounds[0].matches`
4. Lẻ → `round0Byes` / `byes` trong round
5. Set `randomCup.activeCupId`, `status: "running"`

### 6.3 Random đội tuyển

- Mỗi competitor có 1 `country` lúc tạo
- Checkbox **Đổi đội tuyển mỗi vòng** → `rerollCountries` — clone competitor với country mới mỗi vòng

### 6.4 Nhập kết quả

1. User bấm trận `pending` → modal
2. Nhập `scoreA`, `scoreB` (phải có bên thắng)
3. Set `winnerId`, `loserId`, `status: "completed"`
4. `maybeAdvanceCup()` — đẩy vào pool, ghép vòng mới

### 6.5 Nhánh thắng / thua

```text
Thắng → bracketPools.winners
Thua  → bracketPools.losers
```

Sau mỗi vòng: ghép trong pool; lẻ → bye (card **Miễn đấu vòng này**).

### 6.6 Bye

- 1 competitor miễn đấu vòng đó
- Lưu ID trong `round.byes` / `round0Byes`
- Tự đi tiếp pool tương ứng vòng sau

### 6.7 Kết thúc giải — `canCrownWinner(cup)`

```text
Nhánh thắng = đường tới vô địch.
Nhánh thua = đá tiếp / thống kê, KHÔNG chặn kết thúc.
```

Điều kiện:

- `bracketPools.winners.length === 1`
- Không còn match `pending` ở `main` hoặc `winners`
- Nhánh thua không block

Khi đủ:

- `champion` = competitor duy nhất nhánh thắng
- `status = "done"`, `completedAt = ISO`
- `recomputePlayerStats()` + save

---

## 7. Logic sửa tỉ số

- Giải chưa `done`: sửa được (có confirm nếu đã completed)
- Khi sửa:
  1. Cắt các `rounds` sau round đang sửa
  2. `resetCupProgress()` — xóa pool, eliminated từ round đó
  3. `replayCupAdvancement()` — tính lại từ đầu round đã sửa
- Tránh bracket lệch và stats sai

---

## 8. Logic thống kê

**Nguyên tắc:** luôn `recomputePlayerStats()` — **không** cộng incremental.

**Thuật toán:**

1. Reset `randomCup.playerStats = {}`
2. Duyệt mọi `cup` trong `randomCup.cups`
3. Mỗi match `completed`: `wins++` / `losses++` cho `members`
4. Cup `done` hoặc `saved`: mọi `players` → `tournaments++`
5. Champion members → `championships++`
6. `winRate = round(wins / (wins+losses) * 100)`

**Lý do:** tránh double-count khi refresh, sửa tỉ số, replay bracket.

---

## 9. Data schema v2

```js
{
  version: 2,
  updatedAt: "ISO string",
  players: ["Luân", "Hưng", ...],
  tournament: {
    cycles: [],
    activeCycleId: null
  },
  teamsCache: { cachedAt, teams: [...] } | null,
  shuffleHistory: [],
  randomCup: {
    activeCupId: null,
    cups: [],
    playerStats: {}
  }
}
```

| Field | Mô tả |
|-------|--------|
| `players` | Danh sách người chơi dùng chung |
| `tournament` | Giải Nhất Nhì (cycles, league, playoffs) |
| `teamsCache` | Cache 48 đội WC API |
| `shuffleHistory` | Lịch sử bắt đội nhanh (max 20) |
| `randomCup.activeCupId` | ID giải Random Cup đang active |
| `randomCup.cups` | Toàn bộ giải Random Cup |
| `randomCup.playerStats` | Cache thống kê (recompute khi load) |

**Migration trong `applyState()`:**

- Thiếu `shuffleHistory` → `[]`
- Thiếu `randomCup` → object mặc định
- **Không** xóa `players`, `tournament`, `teamsCache` cũ
- Legacy `localStorage` (players/tournament cũ) migrate một lần nếu state GitHub trống

---

## 10. GitHub Sync nhiều thiết bị

### 10.1 Mục tiêu

- Nhiều máy mở cùng link → cùng dữ liệu
- Ghi qua Worker + mã lưu — **không** cần GitHub PAT trên browser
- Token GitHub chỉ trong Worker secret

### 10.2 Đọc dữ liệu

```js
// Ưu tiên nếu đã cấu hình URL trong Cài đặt nâng cao
fetch(`${SYNC_API_URL}/state?t=${Date.now()}`)

// Fallback
fetch(`data/state.json?t=${Date.now()}`)
```

### 10.3 Ghi dữ liệu

```http
POST {SYNC_API_URL}/state
Content-Type: application/json
X-Sync-Key: <mã lưu dữ liệu>
```

```js
{
  state,           // buildStateObject()
  clientId,
  updatedAt,
  baseUpdatedAt    // lastKnownUpdatedAt — optimistic locking
}
```

**Thứ tự ưu tiên ghi (`saveStateToGithub`):**

1. Worker nếu có URL + mã lưu
2. Legacy PAT trong localStorage (nếu có) — không khuyến khích
3. Báo `Chưa lưu được` / `Chưa có mã lưu`

### 10.4 Worker

1. CORS — chỉ origin hợp lệ
2. POST: kiểm tra `X-Sync-Key` === `WRITE_KEY`
3. Validate JSON ≤ 1MB, schema v2
4. So `baseUpdatedAt` vs `serverUpdatedAt` → 409 nếu conflict
5. Commit `data/state.json` qua GitHub API

**Secrets:**

```text
GITHUB_TOKEN   — PAT, quyền Contents read/write
WRITE_KEY      — mã chia sẻ cho nhóm (browser)
```

### 10.5 Conflict 409

Worker trả:

```js
{ ok: false, error: "conflict", serverUpdatedAt, serverState }
```

UI:

- Không ghi đè local
- Footer: `Có dữ liệu mới · Tải lại`
- User bấm **Tải lại** → `reloadRemoteState(true)`

### 10.6 Polling & dirty flag

- `setInterval` **10 giây** + khi tab focus
- `hasUnsavedLocalChanges` — set khi user sửa, clear khi save OK
- Remote `updatedAt` khác:
  - Local **sạch** → apply tự động
  - Local **dirty** → chỉ báo, không overwrite

### 10.7 Footer sync

```text
Đang tải...
Đang lưu...
Đã lưu ✓
Chưa lưu được
Chỉ xem          (chưa cấu hình ghi)
Có dữ liệu mới · Tải lại
```

---

## 11. Cloudflare Worker

**Tên Worker (wrangler):** `fc-mobile-sync`

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/state` | Không | Đọc state (CORS) |
| POST | `/state` | `X-Sync-Key` | Ghi state |
| OPTIONS | `/state` | — | Preflight CORS |

**POST validate:**

- `version >= 2`
- `players[]`, `tournament{}`, `randomCup{}`, `shuffleHistory[]`
- Body ≤ 1MB

**CORS origins (mặc định):**

```text
https://luan20495.github.io
http://localhost:8765
http://127.0.0.1:8765
```

Thêm qua biến Worker `ALLOWED_ORIGINS` (phân cách dấu phẩy).

**Response lỗi thường gặp:**

| HTTP | error | Ý nghĩa |
|------|-------|---------|
| 401 | unauthorized | Thiếu/sai X-Sync-Key |
| 400 | invalid_state | Schema sai |
| 409 | conflict | baseUpdatedAt cũ |
| 403 | forbidden | Origin không hợp lệ |
| 500 | server_misconfigured | Thiếu GITHUB_TOKEN trên Worker |

Chi tiết deploy: `workers/README.md`

---

## 12. Cách chạy local

### Frontend

```bash
cd /path/to/fc-mobile-team-random
python3 -m http.server 8765
```

Mở: `http://localhost:8765`

### Worker local

```bash
cd workers
# Tạo workers/.dev.vars (không commit):
#   WRITE_KEY=your-dev-key
#   GITHUB_TOKEN=ghp_...   (tùy chọn, để test ghi thật)
npx wrangler dev
```

URL mặc định Wrangler: `http://localhost:8787`

Trong app → Cài đặt nâng cao → Địa chỉ đồng bộ = `http://localhost:8787`

### Render lại icon PNG

```bash
npm install
npm run icons
```

---

## 13. Cách deploy GitHub Pages

```bash
git status
git add index.html data/state.json PROJECT_REPORT.md
git add assets/ manifest.webmanifest workers/ .github/workflows/
git commit -m "Deploy FC Mobile Cup"
git push origin main
```

**GitHub Pages settings:**

- Source: branch `main`
- Folder: `/ (root)`

**URL production:**

```text
https://luan20495.github.io/fc-mobile-team-random/
```

> Lưu ý: path repo ảnh hưởng URL Pages. App tự detect `user.github.io/repo` để set `GH_REPO`.

---

## 14. Cách deploy Cloudflare Worker

```bash
cd workers
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put WRITE_KEY
npx wrangler deploy
```

Sau deploy:

1. Copy URL Worker (vd. `https://fc-mobile-sync.<account>.workers.dev`)
2. Mở **FC Mobile Cup** trên Pages
3. **Cài đặt nâng cao** → nhập **Địa chỉ đồng bộ** + **Mã lưu dữ liệu** (cùng `WRITE_KEY`)
4. Thêm player hoặc lưu giải → kiểm tra commit trên GitHub
5. Mở thiết bị khác → thấy dữ liệu sau polling / Tải lại

---

## 15. Cách vận hành thực tế cho người chơi

### 15.1 Bắt đội nhanh

1. Mở link web
2. Thêm tên người chơi
3. Chọn 1v1 / 2v2 / … hoặc Chia 2 đội
4. Bấm **Random**
5. Xem cặp + đội tuyển

### 15.2 Tạo Random Cup

1. Tab **Random Cup**
2. Đặt tên giải, chọn 1v1 hoặc NvN
3. Bấm **Tạo giải**
4. Bấm từng trận → nhập tỉ số
5. App tự tạo vòng tiếp (thắng/thua/bye)
6. Khi còn 1 người nhánh thắng → **vô địch**
7. Tab **Thống kê** xem số liệu

### 15.3 Dùng nhiều thiết bị

1. Mọi người mở cùng link Pages
2. Máy có **mã lưu dữ liệu** mới ghi được
3. Máy khác tự cập nhật (~10s) hoặc bấm **Tải lại**
4. Thấy `Có dữ liệu mới` → bấm Tải lại (đừng ghi đè khi đang sửa dở)

---

## 16. Checklist test

### UI/UX

- [ ] Header: **FC Mobile Cup** + logo mark
- [ ] Favicon tab Chrome
- [ ] Mobile layout không vỡ
- [ ] Modal không tràn màn hình nhỏ
- [ ] Cài đặt nâng cao đóng mặc định
- [ ] Không lộ thuật ngữ kỹ thuật màn chính

### Bắt Đội

- [ ] Thêm / xóa người
- [ ] Random 1v1, 2v2, 3v3 (6 người)
- [ ] Refresh giữ `shuffleHistory`

### Random Cup

- [ ] 1v1 (4 người), 2v2 (8 người)
- [ ] 3 người → bye
- [ ] Nhập kết quả → vòng mới
- [ ] Champion đúng
- [ ] Sửa tỉ số không lệch bracket
- [ ] Stats không cộng trùng

### Sync

- [ ] GET `/state` OK
- [ ] POST không key → 401
- [ ] POST sai key → 401
- [ ] POST đúng key → commit
- [ ] Conflict → 409
- [ ] 2 tab / 2 máy sync
- [ ] Dirty local không bị polling ghi đè

### Console / Network

- [ ] Không lỗi JS đỏ
- [ ] Không 404: `assets/icons/*`, `manifest.webmanifest`, `data/state.json`
- [ ] Không lộ token/secret trong log

---

## 17. Các lỗi đã sửa

| Lỗi | Cách xử lý |
|-----|------------|
| Giải không kết thúc khi nhánh thua còn trận | `canCrownWinner()` — nhánh thắng quyết định champion |
| Grand final winners vs losers chặn giải | Bỏ luật đó; nhánh thua không block |
| Sửa tỉ số làm lệch bracket | Cắt vòng sau, `resetCupProgress`, `replayCupAdvancement` |
| Stats cộng trùng | `recomputePlayerStats()` tính lại từ đầu |
| Schema v1 thiếu field | `applyState()` fallback v2 |
| Competitor ID lạ trong pool | Lọc ID hợp lệ trước ghép |
| Bye không hiển thị | Card **Miễn đấu vòng này** |
| Console spam khi save fail | Không `console.error` khi GitHub save fail |
| Lịch sử bắt đội thiếu metadata | `createdAt`, `mode`, `players`, teams snapshot |
| Mỗi máy cần GitHub PAT | Chuyển ghi qua Cloudflare Worker + WRITE_KEY |
| CORS `*` không an toàn | Whitelist origin |
| POST không auth | `X-Sync-Key` + validate state |
| Polling ghi đè khi đang sửa | `hasUnsavedLocalChanges` + cảnh báo |

---

## 18. Bảo mật

| Quy tắc | Chi tiết |
|---------|----------|
| Không commit secrets | `GITHUB_TOKEN`, `WRITE_KEY`, `workers/.dev.vars` |
| Secret chỉ trên Worker | Browser chỉ lưu mã lưu (localStorage) |
| CORS giới hạn | Không `Access-Control-Allow-Origin: *` cho POST |
| Validate trước commit | Schema v2, max 1MB |
| Conflict handling | Không ghi đè khi `baseUpdatedAt` cũ |

**Trước mỗi commit public, grep:**

```text
ghp_
github_pat_
GITHUB_TOKEN
WRITE_KEY
Authorization
Bearer
```

`.gitignore` đã có: `workers/.dev.vars`, `node_modules/`

---

## 19. Hạn chế hiện tại

- `data/state.json` là file JSON trên git — **không** phải DB realtime
- Sync qua git commit có độ trễ (vài giây đến vài chục giây)
- Ghi đồng thời nhiều người → có thể **409 conflict**
- Worker phải deploy và maintain riêng
- Cần **mã lưu dữ liệu** để ghi; không có mã → chỉ đọc / xem
- Chưa có Worker URL mặc định trong code (`SYNC_API_URL_DEFAULT = ""`)
- `data/state.json` trên `main` remote có thể chưa tồn tại cho đến lần ghi đầu
- README gốc còn ngắn, chưa mô tả đầy đủ sync (xem báo cáo này)
- Chưa có import JSON — chỉ export backup
- PWA chưa có service worker offline

---

## 20. Hướng nâng cấp sau

- Service worker + offline cache
- QR chia sẻ giải / link
- Export ảnh bracket
- Lịch sử theo mùa / phòng riêng
- Role admin / player
- Realtime (D1, Supabase, WebSocket) nếu cần mượt hơn git commit
- Âm thanh / haptic khi vô địch
- Import backup JSON
- Đặt `SYNC_API_URL_DEFAULT` sau khi deploy Worker production

---

## 21. Kết luận

**FC Mobile Cup** đã sẵn sàng dùng thật cho nhóm bạn chơi FC Mobile:

- UI/UX tối giản, dễ hiểu, tính năng phong phú không rối
- **Bắt đội** nhanh: split, 1v1–5v5
- **Random Cup** ổn định: nhánh thắng/thua, bye, sửa tỉ số, champion
- **Giải Nhất Nhì** vòng tròn + playoff
- **Thống kê** và **lịch sử** cá nhân
- **Sync đa thiết bị** qua Cloudflare Worker; dữ liệu trên GitHub repo
- Branding: logo/favicon/PWA manifest

**Để production đầy đủ:**

1. Push code lên `main` → GitHub Pages
2. Deploy Worker + set `GITHUB_TOKEN` và `WRITE_KEY`
3. Cấu hình Địa chỉ đồng bộ + Mã lưu trên mỗi máy cần ghi
4. Chạy checklist mục 16

---

## 22. Quy trình release production

```bash
# 1. Chạy local
python3 -m http.server 8765

# 2. Test UI + logic theo checklist (mục 16)

# 3. Kiểm tra không commit secret
grep -R "ghp_\|github_pat_\|GITHUB_TOKEN\|WRITE_KEY\|Authorization\|Bearer" . \
  --exclude-dir=.git \
  --exclude-dir=node_modules

# 4. Xem diff
git status
git diff -- index.html data/state.json PROJECT_REPORT.md README.md

# 5. Commit
git add index.html data/state.json PROJECT_REPORT.md README.md
git add assets/ manifest.webmanifest workers/ .github/workflows/
git commit -m "Release FC Mobile Cup"

# 6. Push main
git push origin main

# 7. Test GitHub Pages production
# https://luan20495.github.io/fc-mobile-team-random/

# 8. Test Worker production
# GET /state
# POST /state đúng/sai key
```

**Lưu ý quan trọng:**

- **Không push** nếu `grep` thấy secret thật (token, key, `Bearer ghp_...`).
- **Không commit** `workers/.dev.vars` (đã có trong `.gitignore`).
- Sau push, mở production trên trình duyệt → kiểm tra **DevTools → Console** (không lỗi đỏ) và **Network** (không 404 asset, `manifest.webmanifest`, `data/state.json`).
- Worker deploy riêng (`npx wrangler deploy` trong `workers/`) — không tự deploy khi push Pages.

---

## 23. Sự cố thường gặp & cách xử lý

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| ---------- | ---------------------- | ---------- |
| Chưa lưu được | Chưa cấu hình Sync API URL hoặc mã lưu | Vào **Cài đặt nâng cao** → nhập Địa chỉ đồng bộ (URL Worker) + Mã lưu dữ liệu |
| Chỉ xem | Máy chưa có quyền ghi | Nhập mã lưu dữ liệu (cùng `WRITE_KEY` trên Worker) |
| Có dữ liệu mới | Thiết bị khác vừa lưu | Bấm **Tải lại** trong Cài đặt nâng cao |
| Lỗi 401 | Sai hoặc thiếu `X-Sync-Key` | Kiểm tra `WRITE_KEY` trên Worker và mã lưu trên web |
| Lỗi 403 | Origin không nằm trong CORS whitelist | Thêm domain vào `ALLOWED_ORIGINS` (Worker) hoặc `workers/sync-worker.js` |
| Lỗi 409 | Dữ liệu server mới hơn local | **Tải lại** dữ liệu, rồi thao tác lại |
| Lỗi 404 `data/state.json` | File chưa có trên `main` | Commit/push `data/state.json` hoặc lưu lần đầu qua Worker |
| Worker 500 | Thiếu `GITHUB_TOKEN` hoặc cấu hình repo sai | Kiểm tra secret và `workers/wrangler.toml` (`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`) |
| Không thấy icon/logo | Asset path sai hoặc chưa push `assets/` | Kiểm tra `assets/icons/*` trên Pages; path tương đối từ root repo |
| Stats sai | State cũ hoặc sửa `state.json` tay | Refresh app; `applyState()` gọi `recomputePlayerStats()` — đảm bảo cup/match schema đúng |

---

*Báo cáo tạo: tháng 6/2026 · Repo: `luan20495/fc-mobile-team-random`*
