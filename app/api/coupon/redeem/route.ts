import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import { getAuraDatabase } from "@/lib/storage/sqliteStore";
import { awardPoints } from "@/lib/superfan/db";
import { DEFAULT_POINTS } from "@/lib/superfan/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const { code, fanId, communityId } = body as Record<string, string>;
    if (!code || !fanId || !communityId) throw new DomainError("MISSING_PARAMS", "code, fanId and communityId are required.", 400);

    const db = getAuraDatabase();
    const coupon = db.prepare("SELECT * FROM sf_coupon_codes WHERE code=?").get(code.toUpperCase()) as Record<string, unknown> | undefined;
    if (!coupon) throw new DomainError("COUPON_NOT_FOUND", "Coupon code not found.", 404);
    if (coupon.expires_at && new Date(String(coupon.expires_at)) < new Date()) throw new DomainError("COUPON_EXPIRED", "This coupon has expired.", 400);
    if (coupon.max_usage && Number(coupon.usage_count) >= Number(coupon.max_usage)) throw new DomainError("COUPON_EXHAUSTED", "This coupon has been fully redeemed.", 400);

    // Check already redeemed by this fan
    const alreadyRedeemed = db.prepare("SELECT COUNT(*) as c FROM sf_points_transactions WHERE fan_id=? AND community_id=? AND source='coupon' AND source_id=?").get(fanId, communityId, String(coupon.id)) as {c:number};
    if (alreadyRedeemed.c > 0) throw new DomainError("COUPON_ALREADY_USED", "You have already used this coupon.", 409);

    db.prepare("UPDATE sf_coupon_codes SET usage_count=usage_count+1 WHERE id=?").run(coupon.id);
    const ledger = awardPoints(fanId, communityId, DEFAULT_POINTS.coupon, "coupon", String(coupon.id), `Coupon: ${code}`);

    return ok({ redeemed: true, discount: coupon.discount, pointsAwarded: DEFAULT_POINTS.coupon, newBalance: ledger.balance });
  } catch (e) { return handleApiError(e, "COUPON_REDEEM_ERROR"); }
}
