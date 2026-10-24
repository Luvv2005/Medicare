// Do words kitne alag hain (edit distance).
// Adjacent letters ki adla-badli (simarn <-> simran) ko 1 ginta hai.
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // delete
        dp[i][j - 1] + 1,        // insert
        dp[i - 1][j - 1] + cost  // replace
      );
      // transposition: "ar" <-> "ra"
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// Chhote words mein typo allow nahi, lambe words mein zyada
export const allowedDistance = (word) => (word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2);

export function closest(word, candidates) {
  const max = allowedDistance(word);
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(word, c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= max ? best : null;
}