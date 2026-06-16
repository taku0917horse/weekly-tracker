# weekly-tracker — 設計方針

## プロジェクト概要

自分用の週間習慣トラッキングアプリ。
特定のユーザーを対象とした個人ツールであり、汎用性より使いやすさを優先する。

## 技術スタック

- **HTML + CSS + JavaScript のみ**（バニラ）
- フレームワーク・ライブラリ・npm パッケージは追加しない
- ビルドステップなし。`index.html` をそのままブラウザで開けば動く

## データ保存

- データは **localStorage** に保存する
- **キー名は変更しない**（既存ユーザーのデータが消えるため）
  - 習慣データ: `weekly-tracker-v1`
  - iOS バナー非表示フラグ: `ios-banner-dismissed`
- データ形式（`weekly-tracker-v1`）:
  ```json
  {
    "habits": [{ "id": "...", "name": "...", "color": "indigo", "weeklyGoal": 7 }],
    "completions": { "habitId_YYYY-MM-DD": true }
  }
  ```
- スキーマ変更が必要な場合は新しいキー名（例: `weekly-tracker-v2`）を使い、マイグレーション処理を書く

## デプロイ

- **GitHub Pages** で静的ホスティング（ブランチ: `master` / ルートディレクトリ）
- `sw.js` のキャッシュバスティングが必要な場合は `CACHE_NAME` のバージョン番号を上げる

## PWA（iPhone 対応）

- `manifest.json` と `icon.svg` / `icon-maskable.svg` でホーム画面に追加可能
- `<meta name="viewport" content="..., viewport-fit=cover">` + `env(safe-area-inset-*)` でノッチ・Dynamic Island に対応
- `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style` を設定済み
- iOS Safari でのみ表示されるインストール案内バナーあり（`ios-banner-dismissed` で非表示管理）
- **SVG アイコンは iOS 16.4+ の Web App Manifest 経由で有効**。それ以前の iOS では PNG への差し替えを要検討

## エクスポート / インポート

- エクスポート: `state` を JSON ファイルとしてダウンロード（ファイル名: `weekly-tracker-YYYY-MM-DD.json`）
- インポート: JSON ファイルを読み込み、バリデーション後に `state` を上書き
- **インポートは既存データを上書きする**（マージ処理は行わない）

## ランチャー機能（設計方針）

- アプリ内から外部ツール・サービスを起動するランチャーを設ける
- **ユーザー設定式**: アプリ名・URL・アイコンをユーザー自身が登録する形式
- 登録データは localStorage に保存
- URL は `https://` 形式を推奨する（バリデーションで警告表示、ただし強制はしない）
- アイコンはユーザーが指定した絵文字または URL を使用

## CSS の注意点

- CSS でカスタムの `display` を持つ要素（`.modal-overlay`、`#stats-view` など）と
  HTML の `hidden` 属性が競合する。スタイルシート先頭の
  `[hidden] { display: none !important; }` で解決済み。
  新たに `display` を設定する要素に `hidden` を使う場合は同様に注意する
- 習慣ごとのアクセントカラーは CSS カスタムプロパティ `--hc` / `--hc-light` を
  各 `<tr>` にインラインで設定し、子要素から継承させる

## コミット規則

- **コミットメッセージは日本語**で書く
- 形式: `種別: 変更内容の概要`
  - 例: `機能追加: 習慣ごとのカラー設定とドラッグ並び替えを追加`
  - 例: `バグ修正: hidden属性がCSS display:flexに上書きされる問題を修正`
  - 例: `設計: CLAUDE.mdに設計方針を追記`
