import type { UIBlock } from "@/lib/operator/types";
import { Building2, MapPin, Star } from "lucide-react";

interface B2BOpportunityBlockProps {
  block: UIBlock;
}

interface TopBusiness {
  name?: string;
  category?: string;
  address?: string;
  rating?: number;
  source?: string;
}

interface Opportunity {
  title?: string;
  proposedBudget?: number;
  platformCommission?: number;
  estimatedReach?: number;
}

interface BusinessItem {
  name?: string;
  category?: string;
}

interface ScoreItem {
  businessId?: string;
  overallScore?: number;
}

export function B2BOpportunityBlock({ block }: B2BOpportunityBlockProps) {
  const { title, data } = block;
  const topBusiness = data.topBusiness as TopBusiness | null | undefined;
  const opportunity = data.opportunity as Opportunity | null | undefined;
  const businesses = data.businesses as BusinessItem[] | undefined;
  const scores = data.scores as ScoreItem[] | undefined;
  const simulated = data.simulated as boolean | undefined;
  const location = data.location != null ? String(data.location) : null;
  const businessesDiscovered = data.businessesDiscovered != null ? String(data.businessesDiscovered) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-lime-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">{title}</p>
        {simulated && (
          <span className="ml-auto text-[10px] text-amber-400/80">[SIMULATION]</span>
        )}
      </div>

      {location && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="h-3 w-3" />
          <span>{location}</span>
          {businessesDiscovered && (
            <span className="ml-auto text-lime-400">{businessesDiscovered} found</span>
          )}
        </div>
      )}

      {topBusiness && (
        <div className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">{topBusiness.name || ""}</span>
            {topBusiness.rating != null && (
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="text-[11px] text-slate-300">{topBusiness.rating}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-slate-400">{topBusiness.category || ""}</span>
          {topBusiness.address && (
            <p className="mt-0.5 text-[10px] text-slate-500">{topBusiness.address}</p>
          )}
        </div>
      )}

      {opportunity && (
        <div className="rounded-lg bg-lime-500/[0.06] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-lime-400">Best Opportunity</p>
          <p className="mt-0.5 text-xs font-medium text-white">{opportunity.title || ""}</p>
          <div className="mt-1 flex gap-3 text-[10px] text-slate-400">
            {opportunity.proposedBudget != null && (
              <span>Budget: €{opportunity.proposedBudget}</span>
            )}
            {opportunity.platformCommission != null && (
              <span className="text-lime-400">Commission: €{opportunity.platformCommission}</span>
            )}
          </div>
        </div>
      )}

      {businesses && businesses.length > 0 && !topBusiness && (
        <div className="flex flex-col gap-1">
          {businesses.slice(0, 4).map((b, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1">
              <span className="text-xs text-slate-200">{b.name || ""}</span>
              <span className="text-[10px] text-slate-400">{b.category || ""}</span>
            </div>
          ))}
        </div>
      )}

      {scores && scores.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {scores.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1">
              <span className="text-[11px] text-slate-400">{s.businessId || ""}</span>
              <span className="text-xs font-semibold text-lime-400">{s.overallScore ?? 0}/10</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
