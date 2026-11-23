export async function binarySearchQuality(targetBytes, encode, maxRounds = 8) {
  let lo = 0.05;
  let hi = 0.95;
  let rounds = 0;

  const hiBlob = await encode(hi);
  rounds++;
  if (hiBlob.size <= targetBytes) {
    return { blob: hiBlob, quality: hi, rounds, met: true };
  }

  const loBlob = await encode(lo);
  rounds++;
  if (loBlob.size > targetBytes) {
    return { blob: loBlob, quality: lo, rounds, met: false };
  }

  let best = loBlob;
  let bestQuality = lo;
  for (let i = 0; i < maxRounds; i++) {
    const mid = (lo + hi) / 2;
    const blob = await encode(mid);
    rounds++;
    if (blob.size <= targetBytes) {
      best = blob;
      bestQuality = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { blob: best, quality: bestQuality, rounds, met: true };
}