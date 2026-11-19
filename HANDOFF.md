# HANDOFF — TACP (cập nhật 2026-11-19)

Ghi chú bàn giao cho phiên Claude tiếp theo. **Xoá file này khỏi nhánh trước khi mở PR kế tiếp** (nó không thuộc sản phẩm).

## Người dùng
- Gọi là **Song Ngư**; luôn trả lời **tiếng Việt**, ngắn gọn; điều gì chưa chắc thì hỏi lại.
- Không ghi tên model vào commit/PR. Commit kết thúc bằng:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` +
  `Claude-Session: https://claude.ai/code/session_015ds1n7324EzcH5MwbVbmLa`.
  Thân PR kết thúc bằng "🤖 Generated with [Claude Code](https://claude.com/claude-code)" + link session.

## Dự án
- **TACP — The Amazing Command Palette**: gadget MediaWiki (MIT, clean-room so với skin Citizen), bảng lệnh Ctrl/Cmd+K hoặc `/`, chạy trên mọi skin trừ Citizen.
- Repo: `songnguxyz/tacp-gadget`. Spec: artifact https://claude.ai/artifact/Qsz1Gr5sNgQruG7X2XF6hA (**Draft 4**; bản local sửa bằng python ở scratchpad `tacp-spec.html`, có thể đã mất — đọc lại bằng Artifact `read` rồi publish với `url`).
- Spec Draft 4 **chưa** nói về: thẻ namespace (`Bản mẫu:`, `Đặc biệt:`), bộ đệm phím khi tải lõi, trang mô tả deploy kèm, `TACP-standalone.js`, giới hạn 8 file của Litmus. Đã hỏi Song Ngư có cập nhật spec không — chưa có trả lời.

## Trạng thái hiện tại
- `main` = `9a6f121` "Release 0.1.0-rc.8 (#15)", `package.json` = `0.1.0-rc.8`. Nhánh làm việc `cl/focused-allen-ypo3jh` có nội dung trùng `main` (cộng file này).
- **hsckwiki đang chạy rc.8** (Litmus job `job_54cb6a9ed4eb4e5dbe15`, đã ghi thật 2026-11-12). Gadget vẫn **opt-in** (`DEFAULT_ON = false` trong `scripts/build.js`).
- Trang mô tả `MediaWiki:Gadget-TACP` + `/vi` đã có trên hsck (tạo từ rc.7).
- Không còn PR mở; không còn job Litmus chờ duyệt; không có lịch hẹn kiểm tra nào.
- Đang chờ Song Ngư: thử `TACP-standalone.js` trên Cookie Run Wiki (CRW) bằng cách dán vào console.

## Quy trình làm việc (đã ổn định)
1. Chỉ push lên nhánh `cl/focused-allen-ypo3jh` (proxy chặn push tag; force-push bị cấm).
2. Mở PR → `subscribe_pr_activity` → chờ CI (`check`, `e2e (1.43.11)`, `e2e (1.46.2)`, GitGuardian) → squash merge (cần SHA đủ 40 ký tự cho `expectedHeadSha`) → `unsubscribe`.
3. Sau mỗi squash merge: `git fetch origin main && git merge origin/main` (merge commit, không rebase) rồi push để nhánh khớp `main`.
4. Mỗi PR đổi `src/` phải thêm dòng vào `CHANGELOG.md` mục Unreleased (CI kiểm).
5. **Ra RC**: PR nâng `npm version 0.1.0-rc.N --no-git-tag-version` + đổi `## Unreleased` → `## 0.1.0-rc.N — <ngày>` → merge → chạy workflow `release.yml` trên `main` với input `tag: v0.1.0-rc.N` (tạo tag + pre-release + đính `dist/*` + `SHA256SUMS`) → job `litmus` POST tới Litmus tạo **dry run** trên hsck → đưa Song Ngư link `https://litmus.songngu.xyz/c2c/jobs/<id>` để duyệt. Agent **không** duyệt được; muốn bỏ job thì `litmus_stop`.
6. Không chờ bằng `sleep`; dùng `send_later` vài phút để quay lại kiểm Release/Litmus.

## Litmus (cần nhớ)
- Chỉ dự án `hsck` nhận repo này (`gadget_repos`, `accept_rc: true`). Các wiki khác (lhmn, hyakkano_vi/en, cg) thiếu quyền `editsitejs/editsitecss`; crw đang lỗi đăng nhập bot.
- **Tối đa 8 file mỗi release** (pages + definition). Hiện đúng 8: 4 file mã, config (createOnly), `MediaWiki:Gadget-TACP` (createOnly, nội dung `{{MediaWiki:Gadget-TACP/{{CONTENTLANGUAGE}}}}`), `/vi` (createOnly), definition. Build ném lỗi nếu vượt 8. `/en` chỉ là asset tải tay (`Gadget-TACP.en.wiki`) — Song Ngư nói "tiếng Anh cấu hình riêng sau".
- Trang `createOnly` không bao giờ bị ghi đè. Muốn bật `searchTakeover` phải tự sửa `MediaWiki:Gadget-TACP-config.json` trên wiki.

## Kiến trúc nhanh
- `src/loader/TACP.js` (gadget `TACP`, nhỏ, ≤4 KB gzip): phím tắt, nút nổi trên điện thoại, chiếm ô tìm kiếm (capture phase), bộ đệm phím khi lõi đang tải, `fetchCore` (`__STANDALONE__` ? `import()` : `mw.loader.using('ext.gadget.TACP-core')`).
- `src/core/` (gadget ẩn `TACP-core`, Vue 3 + Codex qua ResourceLoader, không bundle): `App.vue`, `results.js`, `input.js` (`parseTrigger`: `#`→section, `@`→lang, `Tên-namespace:`→chip qua `namespaceForPrefix` trong `modes/ns.js`, kể cả `Special:`), `modes/*`, `providers/search.js` (REST title search, fallback opensearch; CirrusSearch full text + "Ý bạn là…").
- `scripts/build.js`: build `TACP`, `TACP-core`, `TACP-standalone.js` (gộp tất cả, dán vào console; từ chối chạy nếu gadget đã chạy), definitions (legacy + JSON), mô tả, `deploy.json`.
- i18n: `i18n/en.json`, `vi.json`, `qqq.json` (giữ đồng bộ); mô tả preferences ở `i18n/description/`.

## Kiểm thử
- `npm run lint`, `npm test` (Vitest, 59 test), `npm run build`, `npm run size`.
- `npm run e2e` (node:test + Playwright, 12 test) trên MediaWiki thật:
  `e2e/setup-wiki.sh 1.43.11 <dir>` (tải tarball, SQLite, deploy theo `deploy.json`, thêm cờ `default`) rồi `php -d apc.enabled=0 -S 127.0.0.1:8080 -t <dir>` rồi `MW_DIR=<dir> npm run e2e`.
- **APCu phải tắt** cho server test: Gadgets cache định nghĩa trong APCu, test sửa trang bằng CLI. (Máy cloud đã cài `php8.3-apcu` để tái hiện.) `CACHE_NONE` cũng được ghi vào LocalSettings.
- CI e2e chạy ma trận 1.43.11 (Codex 1.x) và 1.46.2 (Codex 2.x).

## Môi trường / mẹo
- API hsckwiki chặn máy cloud (trang kiểm tra bot) — kiểm hsck qua Litmus. CRW (`https://cookierun.wiki/mw/api.php`) đọc được: MW 1.43.11, Vector bản cũ, không CSP, không CirrusSearch.
- Wikimedia API từng trả 429 cho IP này.
- `mcp__github__*` không có tạo tag/release → dùng workflow_dispatch như trên.
- Lint còn 24 cảnh báo `max-len` cũ (không phải lỗi).

## Việc còn treo / ý tưởng
- Chờ phản hồi của Song Ngư khi thử `TACP-standalone.js` trên CRW.
- Hỏi Song Ngư có cập nhật spec (Draft 5) cho các tính năng mới không.
- Trước 1.0: `DEFAULT_ON = true`; ma trận skin thủ công (§11.2); publictestwiki chép tay; rollback một thao tác phía Litmus; trang `/en` cho wiki tiếng Anh; cấp quyền Litmus cho các wiki SNXYZ khác.
- Có thể: Enter/Esc trong lúc lõi đang tải chưa xử lý; tải `TACP-standalone.js` từ URL (GitHub Pages/jsDelivr) thay vì dán cả file.
- Nhỏ: GitHub cảnh báo `actions/checkout@v4`, `setup-node@v4` dùng Node 20 (đã bị ép chạy Node 24) — có thể nâng phiên bản action.
