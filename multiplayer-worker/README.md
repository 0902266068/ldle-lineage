# 即時共鬥 Worker

此 Worker 提供 2–4 人房間、WebSocket 即時同步及共用首領血量。原型不發經驗、金幣或掉落。

## 部署一次

1. 在 Cloudflare 建立帳號並確認啟用 Workers。
2. 建立一個限縮到 Workers 編輯/部署權限的 API Token，並在 Cloudflare 帳戶首頁複製 Account ID。
3. 在本儲存庫的 Settings → Secrets and variables → Actions 新增兩個 Repository secrets：
   - CF_API_TOKEN：Cloudflare API Token
   - CF_ACCOUNT_ID：Cloudflare Account ID
4. 開啟 Actions → Deploy co-op WebSocket server → Run workflow。
5. 部署完成後，在工作紀錄中找到 workers.dev 網址，將其填入遊戲「好友共鬥」面板的伺服器網址欄。每位朋友第一次使用也需填入相同網址；遊戲會保存在該裝置瀏覽器。

API Token 不要貼在聊天、原始碼或公開 issue。房間碼只分享給朋友。
