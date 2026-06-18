<div align="center">

# FC Mobile Cup

<img src="assets/brand/app_icon_512.png" width="128" alt="FC Mobile Cup icon">

**Web app mini cho nhóm bạn FC Mobile** — random đội, bắt cặp, tạo giải, nhập kết quả, xem bracket, đồng bộ nhiều máy.

<br>

[![Live Demo](https://img.shields.io/badge/▶_Chơi_ngay-GitHub_Pages-16a34a?style=for-the-badge&logo=github&logoColor=white)](https://luan20495.github.io/fc-mobile-team-random/)
[![PWA](https://img.shields.io/badge/PWA-Cài_được-7c3aed?style=for-the-badge&logo=pwa&logoColor=white)](https://luan20495.github.io/fc-mobile-team-random/)
[![Vanilla JS](https://img.shields.io/badge/Code-Vanilla_JS-ca8a04?style=for-the-badge&logo=javascript&logoColor=white)](./index.html)
[![Sync](https://img.shields.io/badge/Sync-Cloudflare_Worker-0ea5e9?style=for-the-badge&logo=cloudflare&logoColor=white)](./workers/README.md)

<br>

<a href="https://luan20495.github.io/fc-mobile-team-random/">
  <img src="assets/screenshots/giai-nhat-nhi.png" alt="FC Mobile Cup — giao diện Giải Nhất Nhì" width="720">
</a>

<sub>👆 Bấm ảnh để mở bản live · thêm vào màn hình chính trên điện thoại (PWA)</sub>

<br><br>

[📖 Báo cáo vận hành](./PROJECT_REPORT.md) · [☁️ Deploy Worker](./workers/README.md) · [🤖 Agent handoff](./AGENT_HANDOFF.md)

</div>

---

## ✨ Tại sao dùng?

<table>
<tr>
<td width="140" align="center"><img src="assets/brand/dice-mark.svg" width="48" alt=""></td>
<td><strong>Không cần cài app</strong> — mở link, đặt tên profile, chơi ngay. Push <code>main</code> là có bản production.</td>
</tr>
<tr>
<td align="center">🎲</td>
<td><strong>Random đội tuyển</strong> WC 2026 (API) hoặc bộ <strong>16 đội FC Mobile</strong></td>
</tr>
<tr>
<td align="center">🏆</td>
<td><strong>Giải Nhất Nhì</strong> loại trực tiếp / vòng tròn · bracket mirror + BXH điểm</td>
</tr>
<tr>
<td align="center">👤</td>
<td><strong>Profile riêng</strong> trên máy — gán nick giải để xem điểm & lịch sử</td>
</tr>
<tr>
<td align="center">☁️</td>
<td><strong>Đồng bộ nhóm</strong> qua Cloudflare Worker — mọi máy dùng chung data</td>
</tr>
</table>

---

## 🖼️ Giao diện app

<table>
<tr>
<td width="50%" valign="top">

### 🎲 Bắt đội
Random cặp 1v1 / NvN, gán cờ ĐTQG, lịch sử gần đây.

<a href="https://luan20495.github.io/fc-mobile-team-random/">
  <img src="assets/screenshots/bat-doi.png" alt="Tab Bắt đội — random cặp và đội tuyển" width="100%">
</a>

</td>
<td width="50%" valign="top">

### 👤 Profile
Tên profile trên máy (vd. Tứ Hùng) + chọn **tên trong giải** (Hưng, Luân…).

<a href="https://luan20495.github.io/fc-mobile-team-random/">
  <img src="assets/screenshots/profile.png" alt="Tab Profile — thống kê và gán tên giải" width="100%">
</a>

</td>
</tr>
<tr>
<td colspan="2" align="center">

### 🏆 Bracket Giải Nhất Nhì
Sơ đồ loại trực tiếp kiểu FC Mobile · dây nối SVG · nhập tỉ số trực tiếp · tranh hạng 3

<a href="https://luan20495.github.io/fc-mobile-team-random/">
  <img src="assets/screenshots/bracket.png" alt="Bracket knockout — bán kết, chung kết, tranh hạng 3" width="100%">
</a>

</td>
</tr>
</table>

---

## 🎮 Tính năng chính

<table>
<tr>
<td width="33%" valign="top" align="center">

<img src="assets/screenshots/bat-doi.png" width="200" alt="Bắt đội"><br>
<strong>Bắt đội</strong><br>
<sub>1v1 · 2v2→5v5 · random ĐTQG</sub>

</td>
<td width="33%" valign="top" align="center">

<img src="assets/screenshots/giai-nhat-nhi.png" width="200" alt="Giải"><br>
<strong>Giải Nhất Nhì</strong><br>
<sub>Loại TT · vòng tròn · BXH +3/+2/+1</sub>

</td>
<td width="33%" valign="top" align="center">

<img src="assets/screenshots/profile.png" width="200" alt="Profile"><br>
<strong>Profile & điểm</strong><br>
<sub>Tên máy ≠ nick giải · lịch sử cá nhân</sub>

</td>
</tr>
</table>

---

## 🚀 Chạy local

```bash
git clone https://github.com/luan20495/fc-mobile-team-random.git
cd fc-mobile-team-random
python3 -m http.server 8765
```

Mở **http://localhost:8765** — không cần `npm install` để chạy app.

<details>
<summary><strong>Render lại icon PNG (tùy chọn)</strong></summary>

```bash
npm install
npm run icons
```

Sửa `assets/brand/app_icon.svg` rồi chạy lại lệnh trên.

</details>

---

## ☁️ Kiến trúc

```mermaid
flowchart LR
  subgraph clients["📱 Nhiều thiết bị"]
    A[Trình duyệt]
  end

  subgraph pages["GitHub Pages"]
    B[index.html]
    C[data/state.json]
  end

  subgraph worker["Cloudflare Worker"]
    D[GET / POST /state]
  end

  subgraph github["GitHub API"]
    E[(state.json)]
  end

  A --> B
  B -->|đọc| C
  B -->|ghi| D
  D --> E
  E --> C
```

| Thành phần | Vai trò |
|------------|---------|
| [`index.html`](./index.html) | SPA — UI + toàn bộ logic |
| [`data/state.json`](./data/state.json) | Database JSON dùng chung |
| [`workers/`](./workers/) | API đồng bộ, ghi qua GitHub Contents API |
| [`assets/brand/`](./assets/brand/) | Icon & brand assets |
| [`manifest.webmanifest`](./manifest.webmanifest) | PWA / Add to Home Screen |

---

## 📦 Deploy

| Layer | Cách deploy |
|-------|-------------|
| **Frontend** | Push `main` → GitHub Pages (root folder) |
| **Sync API** | `cd workers && npx wrangler deploy` — xem [workers/README.md](./workers/README.md) |
| **Backup** | Workflow `save-state.yml` (manual dispatch) |

---

## 🔐 Bảo mật

**Không commit** token, `WRITE_KEY`, hoặc `workers/.dev.vars`.

Secrets chỉ cấu hình trên Cloudflare Dashboard / GitHub Secrets.

---

## 📁 Tài liệu thêm

| File | Nội dung |
|------|----------|
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | Báo cáo vận hành, schema, checklist test |
| [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) | Bàn giao kỹ thuật cho agent |
| [workers/README.md](./workers/README.md) | Deploy & cấu hình Worker |

---

<div align="center">

**FC Mobile Cup** — làm giải mini cho anh em, không cần Excel.

<br>

[![GitHub Pages](https://img.shields.io/badge/github.io-luan20495-181717?style=flat-square&logo=github)](https://luan20495.github.io/fc-mobile-team-random/)

Made with ⚽ for FC Mobile squad nights

</div>
