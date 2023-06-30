# Haiix Editor

## 概要

- Web ブラウザー上で動作する TypeScript のコードエディターです。
- 複数のファイルやフォルダーを作成して管理できます。
- 作成したコードはその場で実行することができます。
- プロジェクト全体を ZIP ファイルでローカル PC に保存・読み込みができます。
- すべてクライアント上で動作します。作成したコードがサーバーに送信されることはありません。
- 一度読み込んでしまえば、オフライン環境でも動作します。
- Windows 10 上の Edge、Chrome で動作確認をしています。

## デモページ

https://haiix.github.io/editor/

## ビルド方法

1. Node.js と Git をインストール

    各公式ページから最新の安定版をダウンロード、インストールしてください。

1. 任意のディレクトリで Git クローン

    ```bash
    git clone https://github.com/haiix/editor.git
    ```

1. ディレクトリ移動

    ```bash
    cd editor
    ```

1. 必要なモジュールをインストール

    ```bash
    npm install
    ```

1. ビルド

    ```bash
    npx webpack
    ```

1. Webサーバー起動

    ```bash
    npx http-server -p 3000
    ```

1. ブラウザーで開く

    http://localhost:3000/

## 連絡先

haiix268@gmail.com
