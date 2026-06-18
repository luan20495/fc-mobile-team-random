# FC Mobile Cup

Web app nhỏ cho nhóm bạn chơi FC Mobile: bắt đội nhanh, random đội tuyển, tạo Random Cup, nhập kết quả, xem bracket, lưu lịch sử và thống kê.

## Tính năng chính

- Bắt đội nhanh: chia 2 đội, 1v1, 2v2, 3v3, 4v4, 5v5
- Random đội tuyển
- Random Cup: thắng gặp thắng, thua gặp thua, có bye, có champion
- Giải Nhất Nhì: vòng tròn + playoff
- Lịch sử cá nhân
- Thống kê thắng/thua/vô địch
- Đồng bộ nhiều thiết bị qua Cloudflare Worker + `data/state.json`

## Chạy local

```bash
python3 -m http.server 8765
```

Mở:

```text
http://localhost:8765
```

## Deploy

- **Frontend:** GitHub Pages từ branch `main`, root folder
- **Sync API:** Cloudflare Worker trong thư mục `workers/`

Xem hướng dẫn đầy đủ tại:

- [PROJECT_REPORT.md](./PROJECT_REPORT.md)
- [workers/README.md](./workers/README.md)

## Bảo mật

Không commit:

- GitHub token
- `WRITE_KEY`
- `workers/.dev.vars`
