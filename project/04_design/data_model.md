# データモデル

## ER図 (概要)

```
User 1--* Account
User 1--* Session
User 1--* Document
Document 1--* DocumentVersion
```

## Prismaスキーマ

### Auth.js テーブル

| テーブル | 説明 |
|---|---|
| User | ユーザー情報 (email, name, image) |
| Account | OAuth Provider情報 (Google tokens) |
| Session | セッション管理 (DB Session) |
| VerificationToken | メール認証トークン |

### アプリケーションテーブル

#### Document

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| title | String | ドキュメント名 (default: "無題の翻訳") |
| userId | String | FK → User.id |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

#### DocumentVersion

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| documentId | String | FK → Document.id |
| versionNumber | Int | バージョン番号 |
| sourceText | Text | 原文 |
| translatedText | Text | 翻訳文 |
| sourceLang | String | 原文言語コード |
| targetLang | String | 翻訳言語コード |
| journal | String? | ジャーナルスタイル |
| provider | String? | 翻訳プロバイダ (deepl/gemini) |
| leftRanges | Json? | 原文sentence ranges |
| rightRanges | Json? | 翻訳sentence ranges |
| createdAt | DateTime | 作成日時 |

**Unique制約**: (documentId, versionNumber)

## インデックス

- Document: userId
- DocumentVersion: documentId
- DocumentVersion: (documentId, versionNumber) UNIQUE
