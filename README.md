# Weekly Tracker

週単位で習慣をトラッキングする軽量な静的Webアプリです。

## 機能

- 習慣の追加・削除
- 曜日ごと（月〜日）のチェック管理
- 週の移動（前週 / 次週 / 今週）
- 達成率の表示（プログレスバー）
- データは `localStorage` に自動保存
- **PWA 対応** — ホーム画面に追加してアプリとして使用可能
- **オフライン対応** — Service Worker によるキャッシュ
- **エクスポート / インポート** — JSON ファイルでデータをバックアップ・移行
- **iOS セーフエリア対応** — ノッチ・Dynamic Island 領域を考慮したレイアウト
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

## iPhoneのホーム画面に追加する方法

1. Safari で本アプリの URL を開く
2. 下部（または上部）の **共有ボタン（□↑）** をタップ
3. 「**ホーム画面に追加**」を選択 → 「追加」をタップ
4. ホーム画面からアプリとして起動可能になります

> 初回訪問から 1.5 秒後に Safari でのみ案内バナーが表示されます。

## エクスポート / インポート

- **エクスポート**: 「エクスポート」ボタンで JSON ファイルをダウンロード
- **インポート**: 「インポート」ボタンで JSON ファイルを選択して復元
- 機種変更やブラウザ移行時のデータ移行に使用できます

## ファイル構成

```
weekly-tracker/
├── index.html          # アプリのエントリーポイント
├── style.css           # スタイル（セーフエリア対応含む）
├── app.js              # ロジック（localStorage / export / import）
├── manifest.json       # PWA マニフェスト
├── sw.js               # Service Worker（オフライン対応）
├── icon.svg            # アプリアイコン
├── icon-maskable.svg   # マスカブルアイコン（Android ホーム画面用）
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
