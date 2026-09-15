import { backendUrl } from "@/lib/backend";

/**
 * Phiên broker (`cb_live_…`) còn sống không — chỉ backend biết (hash, hạn, membership,
 * domain còn xác minh). Trả `false` DUY NHẤT khi backend nói 401. Lỗi mạng/5xx coi như
 * còn sống: đừng đá người ra vì backend chập chờn; BFF vẫn chặn từng request dữ liệu.
 */
export async function brokerSessionAlive(token: string, hostname: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl()}/api/v1/users/me/principal`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Coldbrew-Host": hostname,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    return res.status !== 401;
  } catch {
    return true;
  }
}
