import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { customerApi } from '../api/autoqueue';

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({ cars: [], inventory: [], queues: [], bookings: [], offers: [] });
  const [message, setMessage] = useState('Loading your workspace…');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [cars, inventory, queues, bookings] = await Promise.all([customerApi.cars(token), customerApi.inventory(token), customerApi.queues(token), customerApi.bookings(token)]);
      const entries = queues.entries || [];
      const offerResponses = await Promise.all(entries.map((entry) => customerApi.offers(token, entry.queueId).catch(() => ({ offers: [] }))));
      setData({ cars: cars.cars || [], inventory: inventory.inventory || [], queues: entries, bookings: bookings.bookings || [], offers: offerResponses.flatMap((item) => item.offers || []) });
      setMessage('Updated just now');
    } catch (error) { setMessage(error.message); }
  }, [token]);
  useEffect(() => { const timer = window.setTimeout(refresh, 0); return () => window.clearTimeout(timer); }, [refresh]);
  const action = async (request) => { try { await request(); await refresh(); } catch (error) { setMessage(error.message); } };
  const visibleInventory = data.inventory.filter((item) => `${item.carModel?.brand} ${item.carModel?.model} ${item.variant} ${item.color} ${item.dealer?.city}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-[#222222] bg-[#0d0d0d] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-neutral-100"></div>
          <span className="font-bold tracking-tight text-neutral-100 uppercase text-sm">
            AutoQueue Console
          </span>
          <span className="text-neutral-600 font-mono text-xs">·</span>
            <span className="text-xs font-mono text-amber-500 uppercase tracking-widest hidden sm:inline">
            Customer Portal
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs text-neutral-200 font-medium">{user?.name}</span>
            <span className="text-[10px] font-mono text-neutral-500">{user?.email}</span>
          </div>
          <button onClick={refresh} className="border border-[#333333] bg-[#161616] text-neutral-300 px-3 py-1.5 text-xs font-mono uppercase">Refresh</button>
          <button onClick={logout}
            className="border border-[#333333] hover:border-red-900/80 bg-[#161616] hover:bg-red-950/20 text-neutral-300 hover:text-red-400 px-3 py-1.5 text-xs font-mono tracking-wider uppercase transition-colors duration-150 rounded-[2px]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Welcome Banner */}
        <div className="border border-[#262626] bg-[#111111] p-6 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 inline-block"></span>
              <span>Session Active · Authorized via JWT</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100 uppercase">
              Welcome, {user?.name || 'Customer'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl font-sans">
              You are authenticated to access AutoQueue centralized waiting lists and receive competitive quotes from verified car dealerships.
            </p>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <div className="border border-[#262626] bg-[#161616] px-3.5 py-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Role Verified</span>
              <span className="text-amber-400 font-semibold uppercase">{user?.role || 'CUSTOMER'}</span>
            </div>
            <div className="border border-[#262626] bg-[#161616] px-3.5 py-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Status</span>
              <span className="text-emerald-400 font-semibold uppercase">Active</span>
            </div>
          </div>
        </div>

        <p className="text-xs font-mono text-neutral-500">{message}</p>
        {/* Customer Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Customer Profile Details (7 Cols) */}
          <div className="lg:col-span-7 border border-[#262626] bg-[#111111] p-6 rounded-[2px]">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-5">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Customer Record Details
              </span>
              <span className="font-mono text-[10px] text-neutral-600">Entity: User</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">User ID:</span>
                <span className="text-neutral-200 select-all font-mono text-[11px]">{user?.userId || 'N/A'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Full Name:</span>
                <span className="text-neutral-200 font-sans font-medium">{user?.name}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Email Address:</span>
                <span className="text-neutral-200">{user?.email}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-[#1a1a1a]">
                <span className="text-neutral-500">Phone Number:</span>
                <span className="text-neutral-200">{user?.phone || 'Not specified'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-neutral-500">Registered:</span>
                <span className="text-neutral-400 text-[11px]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Active Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Current activity (5 Cols) */}
          <div className="lg:col-span-5 border border-[#262626] bg-[#111111] p-6 rounded-[2px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">Live Activity</span>
              </div>

              <div className="space-y-3 text-sm"><p>Active queue entries: <strong>{data.queues.filter((entry) => ['WAITING', 'OFFERED'].includes(entry.status)).length}</strong></p><p>Pending dealer offers: <strong>{data.offers.filter((offer) => offer.status === 'PENDING').length}</strong></p><p>Confirmed bookings: <strong>{data.bookings.filter((booking) => booking.status === 'CONFIRMED').length}</strong></p></div>
            </div>

            <p className="mt-6 border-t border-[#1a1a1a] pt-4 font-mono text-[10px] text-neutral-500">Session credentials are never displayed in the interface.</p>
          </div>
        </div>

        {/* Queues & Market Activity Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Centralized Waiting Lists
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">{data.queues.length}</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              No active vehicle queues joined yet.
            </p>
          </div>

          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Dealer Quotations
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">{data.offers.filter((offer) => offer.status === 'PENDING').length}</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              Dealers will tender offers as vehicles allocate.
            </p>
          </div>

          <div className="border border-[#262626] bg-[#111111] p-5 rounded-[2px]">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Confirmed Reservations
            </span>
            <div className="text-2xl font-mono font-bold text-neutral-100">{data.bookings.filter((booking) => booking.status === 'CONFIRMED').length}</div>
            <p className="text-xs text-neutral-400 mt-2 font-sans">
              Irrevocable price snapshots will appear here.
            </p>
          </div>
        </div>

        <section className="border border-[#262626] bg-[#111111] p-6 rounded-[2px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-mono text-xs uppercase tracking-wider text-neutral-400">Discover cars and available dealer inventory</h2><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search model, variant, colour, city" className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" /></div>
          <div className="grid gap-3 md:grid-cols-2">{visibleInventory.map((item) => <article key={item.inventoryId} className="border border-neutral-800 p-4"><p className="font-semibold">{item.carModel?.brand} {item.carModel?.model}</p><p className="mt-1 text-sm text-neutral-400">{item.variant} · {item.color} · {item.dealer?.dealerName}, {item.dealer?.city}</p><p className="mt-2 text-sm">₹{item.estimatedTotalPrice} · {item.availableUnits} unit(s) available</p><button className="mt-3 text-sm text-orange-400" onClick={() => action(() => customerApi.joinQueue(token, { carModelId: item.carModelId, variant: item.variant, city: item.dealer.city, colorPreference: item.color }))}>Join this queue</button></article>)}</div>
          {!visibleInventory.length && <p className="text-sm text-neutral-500">No available dealer inventory matches your search. Catalogue models may exist without available stock.</p>}
        </section>

        <section className="border border-[#262626] bg-[#111111] p-6 rounded-[2px]"><h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-400">Pending offers</h2>{data.offers.filter((offer) => offer.status === 'PENDING').map((offer) => <div key={offer.offerId} className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3 text-sm"><span>{offer.dealer?.dealerName || 'Dealer'} · ₹{offer.totalPrice}</span><span className="flex gap-2"><button className="text-emerald-400" onClick={() => action(() => customerApi.acceptOffer(token, offer.offerId))}>Accept</button><button className="text-red-400" onClick={() => action(() => customerApi.rejectOffer(token, offer.offerId))}>Reject</button></span></div>)}{!data.offers.some((offer) => offer.status === 'PENDING') && <p className="text-sm text-neutral-500">No pending offers.</p>}</section>
        <section className="border border-[#262626] bg-[#111111] p-6 rounded-[2px]"><h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-400">Your queues</h2>{data.queues.map((queue) => <div key={queue.entryId} className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-3 text-sm"><span>{queue.brand} {queue.model} · {queue.variant} · {queue.status}{queue.position ? ` · #${queue.position}` : ''}</span>{['WAITING','OFFERED'].includes(queue.status) && <button className="text-red-400" onClick={() => action(() => customerApi.leaveQueue(token, queue.queueId))}>Leave</button>}</div>)}{!data.queues.length && <p className="text-sm text-neutral-500">No queues joined.</p>}</section>
        <section className="border border-[#262626] bg-[#111111] p-6 rounded-[2px]"><h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-400">Booking history</h2>{data.bookings.map((booking) => <div key={booking.bookingId} className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-3 text-sm"><span>{booking.inventory?.carModel?.brand} {booking.inventory?.carModel?.model} · ₹{booking.totalPrice} · {booking.status}</span>{booking.status === 'CONFIRMED' && <button className="text-red-400" onClick={() => action(() => customerApi.cancelBooking(token, booking.bookingId))}>Cancel booking</button>}</div>)}{!data.bookings.length && <p className="text-sm text-neutral-500">No booking history.</p>}</section>
      </main>
    </div>
  );
}
