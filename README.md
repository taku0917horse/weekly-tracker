# Weekly Tracker

週単位で習慣をトラッキングする軽量な静的Webアプリです。

## 機能

- 習慣の追加・削除
- 曜日ごと（月〜日）のチェック管理
- 週の移動（前週 / 次週 / 今週）
- 達成率の表示（プログレスバー）
- データは `localStorage` に自動保存
- フレームワーク不使用（HTML + CSS + JavaScript のみ）

## 使い方

1. 下部の入力フォームに習慣名を入力して「追加」をクリック
2. 各曜日のセルをクリックしてチェック ON / OFF を切り替え
3. 左右の矢印ボタンで週を移動できます
4. データはブラウザの localStorage に自動保存されます

## ローカルで開く

```bash
# リポジトリをクローン
git clone https://github.com/<your-username>/weekly-tracker.git
cd weekly-tracker

# index.html をブラウザで直接開く（サーバー不要）
open index.html        # macOS
start index.html       # Windows
xdg-open index.html   # Linux

# または VS Code の Live Server 拡張などを使用
```

## GitHub Pages へのデプロイ

1. GitHub にリポジトリを作成してプッシュ
2. リポジトリの **Settings → Pages** を開く
3. Source を `main` ブランチの `/ (root)` に設定して Save
4. `https://<your-username>.github.io/weekly-tracker/` でアクセス可能になります

## ファイル構成

```
weekly-tracker/
├── index.html   # アプリのエントリーポイント
├── style.css    # スタイル
├── app.js       # ロジック（localStorage 管理 / レンダリング）
├── .gitignore
└── README.md
```

## データ形式

`localStorage` のキー `weekly-tracker-v1` に JSON で保存されます。

```json
{
  "habits": [
    { "id": "abc123", "name": "読書" }
  ],
  "completions": {
    "abc123_2025-01-06": true
  }
}
```

## ライセンス

MIT
