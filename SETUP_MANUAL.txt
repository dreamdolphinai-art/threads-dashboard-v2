# Threads 自動運用ダッシュボード　セットアップマニュアル

このツールを使うと、ThreadsへのAI自動投稿・スケジュール投稿・吉日カレンダー連動などが使えます。
一度セットアップすれば、毎日自動で動き続けます。

---

## 料金について

このツール自体は買い切りですが、利用するサービスの料金は以下の通りです。

| サービス | 料金 | 用途 |
|----------|------|------|
| Vercel | **無料** | アプリのホスティング |
| Turso | **無料** | データベース |
| cron-job.org | **無料** | 自動投稿のスケジュール実行 |
| GitHub | **無料** | コード管理 |
| Threads API | **無料** | Threadsへの投稿 |
| **Anthropic API** | **有料（従量課金）** | AI投稿文の生成（Claude） |

**Anthropic APIの目安：月300〜500円程度**（1日7投稿の場合）
使った分だけの課金なので、生成しなければ0円です。

> ⚠️ AI生成機能を使うには、Anthropic（https://console.anthropic.com）のAPIキーが別途必要です。
> クレジットカード登録後、使用量に応じて課金されます。月数百円程度が目安です。

---

## セットアップの全体像

```
GitHubにコードをアップロード
　↓
Turso（DB）を作成
　↓
Vercelにデプロイ（URLが発行される）
　↓
アプリの設定画面でAPIキーを入力
　↓
cron-job.orgで自動投稿を設定
　↓
完成！
```

所要時間：約30〜60分

---

## 必要なアカウント（すべて無料）

- **GitHub** — github.com
- **Vercel** — vercel.com
- **Turso** — turso.tech
- **cron-job.org** — cron-job.org

---

## 必要なAPIキー

| キー | 取得先 |
|------|--------|
| Threads アクセストークン | Meta Developer（下記参照） |
| Threads ユーザーID | 同上（数字のID） |
| Anthropic APIキー | console.anthropic.com |

---

## STEP 1　Threads APIキーの取得

1. https://developers.facebook.com にアクセスしてログイン
2. 「マイアプリ」→「アプリを作成」→「ビジネス」を選択
3. 左メニューの「Threads API」を追加
4. 「アクセストークンを生成」をクリック
5. **アクセストークン**（長い文字列）と**ユーザーID**（数字）をメモ

---

## STEP 2　Anthropic APIキーの取得

1. https://console.anthropic.com にアクセス・登録
2. 「API Keys」→「Create Key」
3. `sk-ant-...` で始まるキーをメモ

---

## STEP 3　GitHubにコードをアップロード

1. https://github.com にログイン
2. 右上「＋」→「New repository」
3. 名前：`threads-dashboard`、Private → 「Create repository」
4. ターミナル（Mac：Spotlight で「Terminal」）を開き以下を実行：

```bash
cd このフォルダのパス     # 例: cd ~/Downloads/threads-dashboard
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/あなたのGitHubID/threads-dashboard.git
git push -u origin main
```

> pushするとき「Username」「Password」を聞かれたら：
> Username: GitHubのID
> Password: https://github.com/settings/tokens/new で作ったトークン（repoにチェック）

---

## STEP 4　Turso（データベース）のセットアップ

### インストール

ターミナルで実行：

```bash
curl -sSfL https://get.tur.so/install.sh | bash
source ~/.bashrc    # または source ~/.zshrc
```

### ログイン＆DB作成

```bash
turso auth login
turso db create threads-dashboard
turso db show threads-dashboard --url      # → URLをメモ
turso db tokens create threads-dashboard   # → トークンをメモ
```

メモする内容：
- **URL**：`libsql://threads-dashboard-あなたのID.aws-ap-northeast-1.turso.io`
- **Token**：`eyJ...` で始まる長い文字列

---

## STEP 5　Vercelにデプロイ

### CLIのインストール

```bash
npm install -g vercel
```

> npmが入っていない場合：https://nodejs.org からNode.jsをインストール

### ログイン＆デプロイ

```bash
cd このフォルダのパス
vercel login        # ブラウザが開くのでGitHubでログイン
vercel deploy --yes
```

デプロイが完了したらURLが表示されます（例：`https://threads-dashboard-xxx.vercel.app`）

### 環境変数の設定

1. https://vercel.com にブラウザでログイン
2. 作成されたプロジェクトを開く
3. 左メニュー「Environment Variables」→「Add Environment Variable」

以下の2つを追加（**Valueは1行でペースト。改行が入らないよう注意**）：

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | STEP 4 でメモしたURL |
| `TURSO_AUTH_TOKEN` | STEP 4 でメモしたToken |

4. 「Deployments」→ 最新のデプロイの「...」→「Redeploy」

### 本番URLの確認

Redeployが完了したら「Deployments」の `Ready` のURLを本番URLとして使います。

---

## STEP 6　アプリの設定

ブラウザで `https://あなたのURL.vercel.app/settings` を開きます。

以下をすべて入力して「保存する」をクリック：

**API設定**
| 項目 | 入力内容 |
|------|---------|
| Threads アクセストークン | STEP 1 でメモしたもの |
| Threads ユーザーID | STEP 1 でメモした数字 |
| Anthropic APIキー | STEP 2 でメモしたもの |
| Cron Secret | 好きな文字列（例：`mysecret123`）※自動投稿の認証に使います |

**プロフィール設定**（AIが投稿文に反映します）
| 項目 | 入力例 |
|------|-------|
| 発信者名 | りきさん |
| ビジネス概要 | 占いスピを使ったコンテンツ販売 |
| 商品・サービス | 占いスピ2.0（128,000円） |
| 実績・数字 | 開始4ヶ月で月収120万円 |
| ターゲット読者 | 副業・独立を目指している方 |
| 投稿スタイル | 親しみやすい口調。絵文字は控えめ。 |

入力後「接続テスト」ボタンで動作確認できます。

---

## STEP 7　自動投稿のCron設定

1. https://cron-job.org にアクセスして無料登録
2. 「CREATE CRONJOB」をクリック
3. **COMMON** タブで設定：
   - Title：`Threads自動投稿ツール`
   - URL：`https://あなたのURL.vercel.app/api/cron/post`
   - Schedule：`Every 1 hour`（毎時0分に実行）

4. **ADVANCED** タブで設定：
   - Headers → 「ADD」ボタン
   - Key：`Authorization`
   - Value：`Bearer mysecret123`（STEP 6 で設定したCron Secretと同じ）
   - Time zone：`Asia/Tokyo`
   - Request method：`GET`

5. 「CREATE」をクリック

> ℹ️ 毎時0分に実行され、その時刻に設定された承認済み投稿が自動でThreadsに投稿されます。

---

## セットアップ完了！使い方

### 投稿を生成する（AI生成）

1. アプリの「投稿生成」→「AI生成」タブを開く
2. 開始日・日数・1日の投稿数を設定
3. 「生成する」をクリック（30秒〜1分かかります）
4. 生成された投稿を確認して「承認」

### 競合投稿をリライトする

1. 「投稿生成」→「リライト」タブを開く
2. 参考にしたい投稿文を貼り付ける
3. 投稿日・時刻・カテゴリーを設定
4. 「リライトする」をクリック
5. 生成された投稿を確認して「承認」

### ツリー投稿（返信チェーン）

1. 「投稿管理」で投稿の「編集」を開く
2. 「ツリー投稿」セクションの「+ 追加」をクリック
3. 2件目以降の本文を入力して保存
4. 自動投稿時に連続した返信チェーンで投稿されます

### 投稿時刻を変更する

「投稿管理」で投稿の「編集」を開くと、日付・時刻も変更できます。

### 自動投稿

承認した投稿は設定した時刻になると自動でThreadsに投稿されます。  
（毎時0分にcron-job.orgがチェックし、その時刻の投稿を公開します）

### ナレッジのアップロード

「ナレッジ」ページからテキストファイル（.txt/.md/.csv）をアップロードすると、次回からAIがその内容を参考に投稿文を作成します。

### 吉日カレンダー

「吉日」ページで今月の開運日を一覧確認できます。AI生成時に自動で吉日情報が投稿文に反映されます。

### APIコストの確認

設定ページの一番下「Anthropic API 使用量」セクションで今月のトークン使用量と推定コストを確認できます。  
「リセット」ボタンで月初にカウンターをリセットできます。

---

## よくある質問

**Q. 設定ページが「読み込み中」のままになる**
→ Vercelの環境変数（TURSO_DATABASE_URL・TURSO_AUTH_TOKEN）を確認。Tokenは改行なしで1行でペースト。その後Redeployを実行。

**Q. 自動投稿されない**
→ cron-job.orgのジョブが「Enabled」になっているか確認。Authorizationの値がCron Secretと一致しているか確認。

**Q. AI生成でエラーが出る**
→ 設定画面でAnthropicのAPIキーが正しく保存されているか確認。Anthropicの残高も確認（console.anthropic.com）。

**Q. Threads投稿でエラーが出る**
→ Threadsのアクセストークンの有効期限切れの可能性。Meta Developerで再発行してください。

**Q. 投稿文のトーンを変えたい**
→ 設定画面の「投稿スタイル」を変更して再生成。

---

ご不明な点はご購入元までお問い合わせください。
