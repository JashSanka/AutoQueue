import { formatInr } from "../../utils/formatters";

export default function PriceBreakdown({ pricing, title = "Estimated on-road price", compact = false }) {
  const fields = [["Ex-showroom", pricing.exShowroom], ["Insurance", pricing.insurance], ["RTO / registration", pricing.rto], ["Accessories / other charges", pricing.accessories], ["Dealer discount", pricing.discount, true]];
  const total = pricing.totalPrice ?? pricing.estimatedTotalPrice ?? (Number(pricing.exShowroom || 0) + Number(pricing.insurance || 0) + Number(pricing.rto || 0) + Number(pricing.accessories || 0) - Number(pricing.discount || 0));
  return <div className={`price-breakdown ${compact ? "price-breakdown-compact" : ""}`}><p className="price-breakdown-title">{title}</p>{fields.map(([label, value, negative]) => <div className="price-line" key={label}><span>{label}</span><strong>{negative && Number(value) > 0 ? "−" : ""}{formatInr(value)}</strong></div>)}<div className="price-total"><span>{title}</span><strong>{formatInr(total)}</strong></div></div>;
}
