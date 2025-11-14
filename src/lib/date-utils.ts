/**
 * 日付関連のユーティリティ関数
 * 日本時間（JST = UTC+9）を基準にした日付計算
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9時間をミリ秒に変換

/**
 * 日本時間で「今日」の開始時刻（00:00:00 JST）をUTCミリ秒で返す
 */
export function getTodayStartJST(): number {
  const now = Date.now();
  // UTC時刻に日本時間のオフセットを加算して日本時間に変換
  const jstNow = now + JST_OFFSET_MS;
  // 日本時間の今日の00:00:00を計算（ミリ秒を切り捨て）
  const jstTodayStart = Math.floor(jstNow / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
  // UTCに戻す
  return jstTodayStart - JST_OFFSET_MS;
}

/**
 * 日本時間で「今日」の終了時刻（23:59:59.999 JST）をUTCミリ秒で返す
 */
export function getTodayEndJST(): number {
  const todayStart = getTodayStartJST();
  // 今日の開始時刻 + 1日 - 1ミリ秒 = 今日の終了時刻
  return todayStart + 24 * 60 * 60 * 1000 - 1;
}

/**
 * 指定されたUTCミリ秒が日本時間の「今日」に含まれるかどうかを判定
 */
export function isTodayJST(timestamp: number): boolean {
  const todayStart = getTodayStartJST();
  const todayEnd = getTodayEndJST();
  return timestamp >= todayStart && timestamp <= todayEnd;
}

