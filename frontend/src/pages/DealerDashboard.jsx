import { useCallback, useEffect, useState } from "react";
import { dealerApi } from "../api/autoqueue";
import { useAuth } from "../context/useAuth";

export default function DealerDashboard() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({ inventory: [], offers: [], entries: [], bookings: [] });
  const [message, setMessage] = useState("Loading dealer workspace…");
  const refresh = useCallback(async () => {
    try {
      const [inventory, offers, entries, bookings] = await Promise.all([dealerApi.inventory(token), dealerApi.offers(token), dealerApi.eligibleEntries(token), dealerApi.bookings(token)]);
      setData({ inventory: inventory.inventory || [], offers: offers.offers || [], entries: entries.entries || [], bookings: bookings.bookings || [] }); setMessage("Updated just now");
    } catch (error) { setMessage(error.message); }
  }, [token]);
  useEffect(() => { const timer = window.setTimeout(refresh, 0); return () => window.clearTimeout(timer); }, [refresh]);
  return <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100 md:p-10"><header className="mx-auto mb-8 flex max-w-6xl justify-between border-b border-neutral-800 pb-5"><div><p className="text-xs uppercase tracking-widest text-orange-400">Dealer workspace</p><h1 className="text-2xl font-bold">{user.name}</h1></div><span className="flex gap-2"><button className="text-sm text-neutral-300" onClick={refresh}>Refresh</button><button className="text-sm text-neutral-300" onClick={logout}>Sign out</button></span></header><div className="mx-auto max-w-6xl space-y-6"><p className="text-sm text-neutral-500">{message}</p><div className="grid gap-4 md:grid-cols-4">{[["Inventory", data.inventory.length], ["Pending offers", data.offers.filter((offer) => offer.status === "PENDING").length], ["Eligible entries", data.entries.length], ["Confirmed bookings", data.bookings.filter((booking) => booking.status === "CONFIRMED").length]].map(([label, value]) => <div key={label} className="border border-neutral-800 bg-neutral-900 p-5"><p className="text-sm text-neutral-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div><section className="border border-neutral-800 bg-neutral-900 p-5"><h2 className="mb-3 text-sm font-semibold">Inventory</h2>{data.inventory.map((item) => <p className="border-b border-neutral-800 py-2 text-sm" key={item.inventoryId}>{item.carModel?.brand} {item.carModel?.model} · {item.variant} · {item.color} · {item.availableUnits}/{item.totalUnits} units</p>)}{!data.inventory.length && <p className="text-sm text-neutral-500">No inventory is available. Add inventory through the supported API after dealer verification.</p>}</section><section className="border border-neutral-800 bg-neutral-900 p-5"><h2 className="mb-3 text-sm font-semibold">Offers</h2>{data.offers.map((offer) => <p className="border-b border-neutral-800 py-2 text-sm" key={offer.offerId}>{offer.queueEntry?.queue?.carModel?.brand} {offer.queueEntry?.queue?.carModel?.model} · ₹{offer.totalPrice} · {offer.status}</p>)}{!data.offers.length && <p className="text-sm text-neutral-500">No offers submitted.</p>}</section></div></main>;
}
