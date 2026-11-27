export function LocationSummary({ value }) {
  const location = value?.adminLocation || {};
  const hierarchy = ["country", "region", "zone", "woreda", "kebele"].map((key) => location[key]).filter(Boolean);
  if (!hierarchy.length) return <span className="text-xs text-[#8ca4a0]">Administrative location not recorded</span>;
  return <span className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#e8f6f0] px-3 py-1.5 text-xs font-semibold text-[#176c59]">{hierarchy.join(" › ")}</span>;
}
