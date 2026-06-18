# FC Mobile Cup · Tài liệu bàn giao cho Agent

> Tài liệu này mô tả **toàn bộ trạng thái hiện tại** của dự án: kiến trúc, UI, logic, lưu trữ, git, và hướng nâng cấp tiếp.  
> Dùng làm context cho agent (GPT 5.5 / Cursor) khi tiếp tục phát triển.

---

## 1. Tổng quan dự án

| Mục | Giá trị |
|-----|---------|
| **Tên** | FC Mobile Cup |
| **Repo** | `luan20495/fc-mobile-team-random` |
| **Deploy** | GitHub Pages: `https://luan20495.github.io/fc-mobile-team-random/` |
| **Stack** | Single-page app — **một file** `index.html` (~2510 dòng), không build step, không framework |
| **Ngôn ngữ UI** | Tiếng Việt |
| **Đối tượng dùng** | Nhóm bạn chơi FC Mobile, chia đội / bắt đối / giải mini |

### Mục tiêu sản phẩm

1. **Bắt Đội** — chia người chơi ngẫu nhiên + gán đội tuyển WC 2026
2. **Giải Nhất Nhì** — vòng tròn tính điểm → playoff (Nhất vs Nhì, Ba vs Tư)
3. **Lịch sử cá nhân** — xem các giải đã tham gia theo tên
4. **Đồng bộ đa máy** — dữ liệu lưu trên GitHub (`data/state.json`), không phụ thuộc `localStorage` cho dữ liệu chính

---

## 2. Cấu trúc file

```
fc-mobile-team-random/
├── index.html          # Toàn bộ HTML + CSS + JS
├── data/
│   └── state.json      # Nguồn dữ liệu chính (đọc/ghi qua GitHub)
├── README.md           # ⚠️ LỖI THỜI — vẫn ghi localStorage
└── AGENT_HANDOFF.md    # File này
```

**Không có:** `package.json`, test, CI, module bundler, component split.

---

## 3. Trạng thái Git

### Nhánh

| Nhánh | Nội dung |
|-------|----------|
| `main` | WC 2026 API integration (`30636ab`) |
| `feature/giai-nhat-nhi` | Tab + Giải Nhất Nhì + bracket FC Mobile style + **GitHub sync (chưa commit)** |

### Commit trên `feature/giai-nhat-nhi` (sau `main`)

```
436215d  Redesign tournament bracket as FC Mobile knockout tree diagram
6679495  Add Giải Nhất Nhì tournament with round-robin, playoffs, player history
6397e45  Add tab navigation and shared player panel across app views
```

### Chưa commit (working tree)

- `index.html` — GitHub persistence + UI sync đơn giản
- `data/state.json` — file state mặc định (untracked)

### Lưu ý deploy

- GitHub Pages deploy từ **`main`**
- Ghi API luôn target nhánh **`main`** (`GH_BRANCH = "main"`)
- Cần **merge + push `main`** (kèm `data/state.json`) thì production mới có đủ tính năng

---

## 4. Kiến trúc UI

### 4.1 Layout tổng thể

```
┌─────────────────────────────────────────┐
│ header: tiêu đề + team-status (WC API)  │
├─────────────────────────────────────────┤
│ nav.app-tabs: Bắt Đội | Giải | Lịch sử  │
├─────────────────────────────────────────┤
│ panel CHUNG: Người chơi (chips + thêm)  │  ← luôn hiện mọi tab
├─────────────────────────────────────────┤
│ #view-shuffle      (active mặc định)    │
│ #view-tournament                        │
│ #view-profile                           │
├─────────────────────────────────────────┤
│ #score-modal (overlay nhập tỉ số)       │
├─────────────────────────────────────────┤
│ footer #sync-status: Đang tải/Đã lưu ✓  │
│ <details> Cài đặt lưu dữ liệu (token)   │
└─────────────────────────────────────────┘
```

### 4.2 Tab navigation

- Class `.app-tab` + `data-view="shuffle|tournament|profile"`
- View: `.view` với id `view-{name}`, toggle class `active`
- Hàm `switchView(view)` — re-render tournament/profile khi chuyển tab

### 4.3 Design system (CSS inline trong `<style>`)

| Token | Giá trị |
|-------|---------|
| Nền | Gradient tối `#0f172a` → `#1e1b4b` |
| Accent xanh | `#4ade80` (shuffle, success) |
| Accent vàng | `#facc15` (gold, CTA) |
| Accent tím | `#8b5cf6` / `#7c3aed` (tournament / FC diagram) |
| Font | System UI stack |
| Panel | `border-radius: 16px`, glassmorphism nhẹ |

**FC Mobile bracket** — class prefix `fc-*`:
- `fc-diagram`, `fc-knockout-*`, `fc-league-*`, `fc-slot`, `fc-bk-match`, `fc-trophy-hero`
- Sơ đồ đối xứng: vòng tròn (cột trái) → playoff tree (giữa) giống bracket in-game WC

### 4.4 UX đồng bộ (đã đơn giản hóa theo yêu cầu user)

User **không cần biết** GitHub / `state.json`. Chỉ thấy:

| Trạng thái | Text footer `#sync-status` |
|------------|----------------------------|
| Đang load | `Đang tải...` |
| Đang ghi | `Đang lưu...` |
| Thành công | `Đã lưu ✓` |
| Lỗi | `Lỗi lưu` / `Chưa lưu được` |

Token GitHub nằm trong `<details class="sync-settings">` — đóng mặc định, label **「Cài đặt lưu dữ liệu」**.

---

## 5. Tính năng: Bắt Đội (`view-shuffle`)

### 5.1 Chế độ chia (`mode`)

| `data-mode` | Logic `getSplit()` |
|-------------|-------------------|
| `split` | Chia 2 đội đều nhất: `ceil(n/2)` vs `floor(n/2)` |
| `2v2` | 4 người đá, còn lại dự bị |
| `1v1` | Ghép cặp lẻ/chẵn, lẻ → 1 dự bị |

Nút mode tự disable khi không đủ người (`updateModeButtons()`).

### 5.2 Random đội tuyển

- API: `GET https://worldcup26.ir/get/teams` → 48 đội WC 2026
- Map tên VN qua object `VN_NAMES`
- Mỗi người chơi nhận 1 đội ngẫu nhiên (`assignTeams()`)
- Hiển thị cờ: `<img>` từ URL API hoặc `flagcdn.com` (fallback)

### 5.3 Animation shuffle

`doShuffle()` — 12 vòng fake shuffle (80ms + round×8ms), class `shuffling`, rồi kết quả thật + `reveal`.

### 5.4 Lịch sử bắt đội

- Biến `history` — **chỉ trong RAM**, tối đa 10 lần
- **KHÔNG lưu GitHub** — mất khi refresh
- Cấu trúc: `{ type: "pairs"|"teams", pairs/a/b/bench, teams: { name → team } }`

### 5.5 Share box

Copy URL hiện tại (`window.location.href`) — dùng chung link GitHub Pages.

---

## 6. Tính năng: Giải Nhất Nhì (`view-tournament`)

### 6.1 Luồng giải

```
[+ Giải mới]
    → generateRoundRobin(players)     # thuật toán vòng tròn classic (rotate)
    → phase = "league"
    → user nhập tỉ số từng trận (modal)
    → leagueComplete() ?
        ├─ ≥4 người: phase = "playoffs", generatePlayoffs(standings)
        └─ 3 người: phase = "done", locked (chỉ vòng tròn, không playoff)
    → playoffsComplete() ?
        → phase = "done", locked, activeCycleId = null
```

### 6.2 Điểm & xếp hạng

- Thắng **3đ**, hòa **1đ**, thua **0đ**
- Tiebreak: điểm → **đối đầu trực tiếp** (`headToHead`) → hiệu số bàn

### 6.3 Playoff

Chỉ khi **≥4 người**, sau khi hết vòng tròn:

| Trận | `type` | Cặp |
|------|--------|-----|
| Chung kết | `final` | Hạng 1 vs 2 |
| Tranh hạng 3 | `third` | Hạng 3 vs 4 |

### 6.4 Khóa giải

- Giải tự khóa (`locked: true`) khi hoàn tất
- Bấm **+ Giải mới** khi giải đang dở → `confirm()` → khóa giải cũ, tạo cycle mới với `players` hiện tại

### 6.5 Nhập kết quả

- Modal `#score-modal` — input số, quick buttons (2-1, 1-1, 1-2)
- Mỗi trận chỉ nhập **một lần** (`played: true`, `lockedAt`)
- Không sửa sau khi khóa

### 6.6 Render bracket

| Hàm | Vai trò |
|-----|---------|
| `renderTournament()` | Entry point tab giải |
| `renderFcDiagram(cycle, interactive, highlightPlayer)` | Sơ đồ đầy đủ |
| `renderLeagueColumns()` | Vòng tròn theo cột vòng |
| `renderKnockoutTree()` | Playoff tree FC Mobile style |
| `renderStandingsBar()` | Chip BXH nhanh trên sơ đồ |
| `bindBracketClicks()` | Click trận chưa đá → mở modal |

Giải đã qua: `#past-cycles` — `renderCycleSummary()` read-only.

---

## 7. Tính năng: Lịch sử cá nhân (`view-profile`)

- Input `#profile-name-input` + chips từ tất cả tên đã từng có
- `renderProfile(name)` — lọc `tournamentData.cycles` có chứa tên (case-insensitive)
- Hiển thị lại `renderCycleSummary(c, highlightPlayer)` với highlight vàng trên sơ đồ
- Nếu đang trong giải active → banner xanh 「Đang thi đấu Giải #N」

---

## 8. Lưu trữ & đồng bộ GitHub

### 8.1 Nguyên tắc

| Dữ liệu | Nơi lưu |
|---------|---------|
| `players`, `tournament`, `teamsCache` | `data/state.json` trên GitHub |
| GitHub PAT (ghi) | `localStorage` key `fc-mobile-gh-token` **duy nhất** |
| Lịch sử bắt đội (`history`) | RAM only — **chưa persist** |

### 8.2 Schema `data/state.json`

```json
{
  "version": 1,
  "updatedAt": "ISO-8601",
  "players": ["Luân", "Hưng", ...],
  "tournament": {
    "cycles": [ /* Cycle[] */ ],
    "activeCycleId": "string|null"
  },
  "teamsCache": {
    "cachedAt": "ISO-8601",
    "teams": [{ "flag": "url", "name": "VN name", "group": "A" }]
  }
}
```

### 8.3 Schema `Cycle`

```typescript
interface Cycle {
  id: string;              // uid()
  number: number;          // 1, 2, 3...
  createdAt: string;
  completedAt: string|null;
  locked: boolean;
  players: string[];       // snapshot lúc tạo giải
  phase: "league" | "playoffs" | "done";
  league: Match[];
  playoffs: PlayoffMatch[];
}

interface Match {
  id: string;
  home: string;
  away: string;
  round: number;
  scoreHome: number|null;
  scoreAway: number|null;
  played: boolean;
  lockedAt: string|null;
}

interface PlayoffMatch extends Match {
  type: "final" | "third";
  label: string;
  homeSeed: number;
  awaySeed: number;
}
```

### 8.4 Luồng đọc/ghi

```
boot()
  → refreshStateSha()        # nếu có token
  → loadStateFromGithub()    # GET data/state.json?t=timestamp
  → applyState()
  → migrate legacy localStorage (một lần)
  → renderPlayerChips() + renderTournament()
  → loadTeamsFromApi()       # ưu tiên teamsCache trong state

savePlayers() / saveTournamentData() / saveTeamsCache()
  → scheduleSaveToGithub()   # debounce 800ms
  → saveStateToGithub()      # PUT GitHub Contents API
```

### 8.5 GitHub API

| Constant | Giá trị |
|----------|---------|
| `GH_REPO` | Auto-detect từ `*.github.io` URL, fallback `luan20495/fc-mobile-team-random` |
| `GH_BRANCH` | `main` |
| `STATE_PATH` | `data/state.json` |
| Đọc | `fetch('data/state.json')` relative (GitHub Pages) |
| Ghi | `PUT /repos/{owner}/{repo}/contents/data/state.json` + Bearer token |
| Content | Base64 UTF-8 (`toBase64Utf8`) |
| SHA | Cần `stateSha` cho update; `refreshStateSha()` lấy trước khi ghi |

### 8.6 Migration localStorage cũ

Keys legacy (xóa sau migrate):

- `fc-mobile-players`
- `fc-mobile-tournament`
- `fc-mobile-wc-teams`

Logic:
- Nếu GitHub load OK + local còn data + GitHub state **rỗng** → merge local → ghi GitHub
- Nếu GitHub đã có data → xóa local, **ưu tiên GitHub**
- Nếu GitHub load fail → migrate local, chờ token để ghi

### 8.7 Teams API cache

- `loadTeamsFromApi()` check `stateTeamsCache` trước
- Chỉ gọi `worldcup26.ir` nếu chưa có cache
- Sau fetch thành công → `saveTeamsCache()` → trigger GitHub save
- Fallback: 5 đội hardcoded `FALLBACK_TEAMS`

---

## 9. Bản đồ hàm quan trọng (JS)

### Persistence
- `loadStateFromGithub`, `saveStateToGithub`, `scheduleSaveToGithub`
- `applyState`, `buildStateObject`, `migrateLegacyLocalStorage`
- `setSyncStatus`

### Players
- `renderPlayerChips`, `addPlayer`, `removePlayer`, `savePlayers`

### Shuffle
- `getSplit`, `doShuffle`, `assignTeams`, `renderResult`, `renderHistory`

### Tournament
- `startNewCycle`, `saveMatchScore`, `maybeAdvancePhase`
- `generateRoundRobin`, `computeStandings`, `generatePlayoffs`
- `renderTournament`, `renderFcDiagram`, `renderKnockoutTree`

### Profile
- `renderProfile`, `renderProfileChips`, `renderCycleSummary`

### Teams
- `loadTeamsFromApi`, `mapApiTeams`, `loadTeamsCache`, `saveTeamsCache`

### Utils
- `uid`, `shuffle`, `showToast`, `switchView`, `boot`

---

## 10. Event listeners (cuối `<script>`)

| Element | Hành động |
|---------|-----------|
| `.mode-btn` | Đổi mode chia |
| `#add-btn`, `#name-input` Enter | Thêm người |
| `#shuffle-btn` | `doShuffle()` |
| `#copy-btn` | Copy URL |
| `.app-tab` | `switchView()` |
| `#new-cycle-btn` | `startNewCycle()` |
| `#profile-search-btn` | `renderProfile` + switch tab |
| `#modal-*` | Nhập / huỷ tỉ số |
| `#gh-token-save` | Lưu PAT + ghi ngay |
| `#gh-sync-btn` | Tải lại state từ GitHub |

---

## 11. Hạn chế & bug tiềm ẩn

1. **Token GitHub thủ công** — mỗi máy mới phải nhập PAT; user không technical khó setup
2. **Ghi vào `main` trực tiếp** — không có PR/review; conflict SHA nếu 2 người ghi cùng lúc
3. **Lịch sử bắt đội không persist** — refresh mất
4. **`README.md` lỗi thời** — vẫn nói localStorage
5. **Feature branch chưa merge** — production Pages chưa có giải + sync
6. **`data/state.json` chưa push** — app production chưa đọc được state
7. **Không có auth user** — ai có link + token đều ghi được
8. **3 người** — chỉ vòng tròn, không playoff (by design)
9. **Không edit/xoá tỉ số** sau khi khóa trận
10. **CORS** — GitHub Contents API cần token hợp lệ; đọc `state.json` public OK

---

## 12. Hướng nâng cấp gợi ý (cho agent tiếp theo)

### Ưu tiên cao
- [ ] Merge `feature/giai-nhat-nhi` → `main`, push `data/state.json`
- [ ] Cập nhật `README.md`
- [ ] Persist `history` bắt đội vào `state.json`
- [ ] Giải pháp ghi không cần user nhập token (GitHub Actions workflow_dispatch, hoặc backend nhỏ)

### UX
- [ ] Toast khi `Đang lưu...` / conflict
- [ ] Polling hoặc nút sync tự động khi tab focus (multi-device)
- [ ] Ẩn hoàn toàn token — embed qua GitHub OAuth hoặc repo secret + Action

### Tournament
- [ ] Sửa tỉ số (admin) trước khi khóa giải
- [ ] Export ảnh bracket
- [ ] Thống kê tổng (VĐ, số trận, win rate) trên profile

### Kỹ thuật
- [ ] Tách JS/CSS ra file riêng (vẫn static, không bắt buộc bundler)
- [ ] Optimistic UI + retry khi GitHub API fail
- [ ] Version field trong state + migration `version: 2`

### Dev
```bash
# Local server
python3 -m http.server 8765
# Mở http://localhost:8765
```

---

## 13. Quy tắc code (từ user)

- **Minimal diff** — không refactor lan man
- Khớp style hiện có (vanilla JS, inline CSS, tiếng Việt UI)
- Không over-engineer
- Chỉ commit khi user yêu cầu
- User-facing text: đơn giản (「Đã lưu ✓」, không jargon GitHub)

---

## 14. Checklist trước khi ship production

- [ ] `data/state.json` có trên `main`
- [ ] `index.html` mới trên `main`
- [ ] GitHub Pages enabled, source = `main` / root
- [ ] Ít nhất 1 người đã nhập token và ghi thành công
- [ ] Test: thêm tên → refresh → còn data
- [ ] Test: nhập kết quả giải → máy khác Tải lại → thấy kết quả
- [ ] Test: WC teams load từ cache (không gọi API lần 2)

---

*Tài liệu tạo: 2026-06-17 · Branch tham chiếu: `feature/giai-nhat-nhi` (uncommitted GitHub sync)*
