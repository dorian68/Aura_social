import { ok, fail, handleApiError, readJsonBody } from "@/lib/apiResponse";
import { DomainError } from "@/lib/domainError";
import {
  getCommunityBySlug, getFanByEmail, createFan, getMembership,
  createMembership, awardPoints, getMembershipByReferralCode, createReferral, getLedger,
} from "@/lib/superfan/db";
import { DEFAULT_POINTS } from "@/lib/superfan/types";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await readJsonBody(req);
    const { email, displayName, whatsapp, city, referralCode } = body as Record<string, string>;

    if (!email || !email.includes("@")) throw new DomainError("INVALID_EMAIL", "A valid email is required.", 400);

    const community = getCommunityBySlug(slug);
    if (!community) throw new DomainError("CLUB_NOT_FOUND", "Club not found.", 404);
    if (!community.isPublic) throw new DomainError("CLUB_PRIVATE", "This club is invite-only.", 403);

    // Get or create fan
    let fan = getFanByEmail(email);
    let referrerMembership = referralCode ? getMembershipByReferralCode(referralCode) : null;
    const referredBy = referrerMembership?.fanId;

    if (!fan) {
      fan = createFan({ email, displayName: displayName?.trim() || undefined, whatsapp: whatsapp?.trim() || undefined, city: city?.trim() || undefined, referredBy });
    }

    // Check if already a member
    const existing = getMembership(community.id, fan.id);
    if (existing) {
      const ledger = getLedger(fan.id, community.id);
      return ok({ alreadyMember: true, fan: { id: fan.id, displayName: fan.displayName ?? email.split("@")[0] }, membership: existing, points: ledger.balance });
    }

    // Create membership
    const membership = createMembership(community.id, fan.id);

    // Welcome points
    const ledger = awardPoints(fan.id, community.id, DEFAULT_POINTS.join_welcome, "join_welcome", membership.id, "Welcome to the club!");

    // Referral reward
    if (referrerMembership && referrerMembership.communityId === community.id && referrerMembership.fanId !== fan.id) {
      createReferral(referrerMembership.fanId, fan.id, community.id, DEFAULT_POINTS.referral_referrer);
      awardPoints(referrerMembership.fanId, community.id, DEFAULT_POINTS.referral_referrer, "referral", fan.id, `Referral: ${fan.email}`);
      awardPoints(fan.id, community.id, DEFAULT_POINTS.referral_new_fan, "referral", referrerMembership.fanId, "Joined via referral");
    }

    return ok({
      alreadyMember: false,
      fan: { id: fan.id, displayName: fan.displayName ?? email.split("@")[0] },
      membership: { ...membership, referralLink: `${community.slug}/join?ref=${membership.referralCode}` },
      points: { balance: ledger.balance, justEarned: DEFAULT_POINTS.join_welcome },
    }, { clubName: community.name });
  } catch (e) { return handleApiError(e, "JOIN_ERROR"); }
}
