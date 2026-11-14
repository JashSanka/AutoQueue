import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/useAuth";
import { customerApi } from "../api/autoqueue";
import VehicleImage from "../components/common/VehicleImage";
import PriceBreakdown from "../components/common/PriceBreakdown";
import { formatInr, formatDate } from "../utils/formatters";

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({
    cars: [],
    inventory: [],
    queues: [],
    bookings: [],
    offers: [],
  });
  const [message, setMessage] = useState("Loading customer workspace…");
  const [messageType, setMessageType] = useState("info");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter State for Unified Browsing
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL"); // "ALL", "IN_STOCK", "NO_STOCK"

  // Pricing breakdowns toggled per inventoryId
  const [expandedPricing, setExpandedPricing] = useState({});

  // Show/hide past queue history
  const [showQueueHistory, setShowQueueHistory] = useState(false);

  // Join Queue Modal State
  const [joinModal, setJoinModal] = useState(null);
  // { carModelId, brand, model, imageUrl, variant, city, preferredDealerId, color, availableDealers: [] }
  const [modalVariant, setModalVariant] = useState("");
  const [modalCity, setModalCity] = useState("Delhi");
  const [modalPreferredDealerId, setModalPreferredDealerId] = useState("");
  const [modalColor, setModalColor] = useState("");

  const notify = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [cars, inventory, queues, bookings] = await Promise.all([
        customerApi.cars(token),
        customerApi.inventory(token),
        customerApi.queues(token),
        customerApi.bookings(token),
      ]);

      const entries = queues.entries || [];
      const offerResponses = await Promise.all(
        entries.map((entry) =>
          customerApi.offers(token, entry.queueId).catch(() => ({ offers: [] }))
        )
      );

      setData({
        cars: cars.cars || [],
        inventory: inventory.inventory || [],
        queues: entries,
        bookings: bookings.bookings || [],
        offers: offerResponses.flatMap((item) => item.offers || []),
      });
      notify("Workspace updated just now", "info");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const action = async (request, successMsg = "Operation completed successfully") => {
    try {
      await request();
      notify(successMsg, "success");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  // Defensive filtering: exclude test audit records from normal customer display
  const isDemoCar = (car) =>
    car &&
    !car.brand?.startsWith("AuditBrand") &&
    !car.brand?.startsWith("TestBrand");

  const realCars = useMemo(() => data.cars.filter(isDemoCar), [data.cars]);

  const realInventory = useMemo(
    () =>
      data.inventory.filter((item) =>
        item.carModel ? isDemoCar(item.carModel) : true
      ),
    [data.inventory]
  );

  // Distinct cities from available inventory for filter dropdown
  const availableCities = useMemo(() => {
    const cities = new Set();
    realInventory.forEach((item) => {
      if (item.dealer?.city) cities.add(item.dealer.city);
    });
    return Array.from(cities).sort();
  }, [realInventory]);

  // Unified Cars with their matching Dealership inventory
  const consolidatedCars = useMemo(() => {
    return realCars.map((car) => {
      const matchingInventory = realInventory.filter(
        (inv) => inv.carModelId === car.carModelId
      );
      const totalAvailable = matchingInventory.reduce(
        (sum, inv) => sum + (inv.availableUnits || 0),
        0
      );
      const distinctVariants = Array.from(
        new Set(matchingInventory.map((i) => i.variant).filter(Boolean))
      );
      const distinctDealers = Array.from(
        new Set(matchingInventory.map((i) => i.dealerId).filter(Boolean))
      );
      return {
        ...car,
        inventory: matchingInventory,
        totalAvailableStock: totalAvailable,
        variants: distinctVariants,
        dealerCount: distinctDealers.length,
      };
    });
  }, [realCars, realInventory]);

  // Filtered cars based on search, city filter, and availability filter
  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase();

    return consolidatedCars.filter((car) => {
      // 1. Text Search across Brand & Model
      const matchesSearch =
        !query ||
        `${car.brand} ${car.model}`.toLowerCase().includes(query) ||
        car.variants.some((v) => v.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // 2. City Filter
      if (cityFilter !== "ALL") {
        const hasCityStock = car.inventory.some(
          (inv) =>
            inv.dealer?.city?.toLowerCase() === cityFilter.toLowerCase()
        );
        if (!hasCityStock) return false;
      }

      // 3. Availability Filter
      if (availabilityFilter === "IN_STOCK" && car.totalAvailableStock <= 0) {
        return false;
      }
      if (availabilityFilter === "NO_STOCK" && car.totalAvailableStock > 0) {
        return false;
      }

      return true;
    });
  }, [consolidatedCars, search, cityFilter, availabilityFilter]);

  // Queue separation: Active vs Past History
  const activeQueues = useMemo(
    () => data.queues.filter((entry) => ["WAITING", "OFFERED"].includes(entry.status)),
    [data.queues]
  );
  const pastQueues = useMemo(
    () => data.queues.filter((entry) => ["LEFT", "BOOKED"].includes(entry.status)),
    [data.queues]
  );
  const pendingOffers = useMemo(
    () => data.offers.filter((offer) => offer.status === "PENDING"),
    [data.offers]
  );
  const confirmedBookings = useMemo(
    () => data.bookings.filter((b) => b.status === "CONFIRMED"),
    [data.bookings]
  );

  // Total regional stock count across real inventory
  const totalStockCount = useMemo(
    () => realInventory.reduce((sum, item) => sum + (item.availableUnits || 0), 0),
    [realInventory]
  );

  const togglePricingBreakdown = (inventoryId) => {
    setExpandedPricing((prev) => ({
      ...prev,
      [inventoryId]: !prev[inventoryId],
    }));
  };

  // Open Join Queue modal from specific dealer inventory row
  const openJoinModalFromInventory = (item) => {
    const car = realCars.find((c) => c.carModelId === item.carModelId);
    const dealers = realInventory
      .filter((i) => i.carModelId === item.carModelId && i.dealer)
      .map((i) => i.dealer);
    const uniqueDealers = Array.from(
      new Map(dealers.map((d) => [d.dealerId, d])).values()
    );

    setJoinModal({
      carModelId: item.carModelId,
      brand: item.carModel?.brand || car?.brand || "Vehicle",
      model: item.carModel?.model || car?.model || "Model",
      imageUrl: item.carModel?.imageUrl || car?.imageUrl,
      availableDealers: uniqueDealers,
    });
    setModalVariant(item.variant || "Standard");
    setModalCity(item.dealer?.city || "Delhi");
    setModalPreferredDealerId(item.dealerId || "");
    setModalColor(item.color || "");
  };

  // Open Join Queue modal from general car model card
  const openJoinModalFromCar = (car) => {
    const matchingStock = realInventory.filter((i) => i.carModelId === car.carModelId);
    const dealers = matchingStock.map((i) => i.dealer).filter(Boolean);
    const uniqueDealers = Array.from(
      new Map(dealers.map((d) => [d.dealerId, d])).values()
    );

    const firstStock = matchingStock[0];
    setJoinModal({
      carModelId: car.carModelId,
      brand: car.brand,
      model: car.model,
      imageUrl: car.imageUrl,
      availableDealers: uniqueDealers,
    });
    setModalVariant(firstStock?.variant || "Standard");
    setModalCity(firstStock?.dealer?.city || "Delhi");
    setModalPreferredDealerId("");
    setModalColor(firstStock?.color || "");
  };

  const handleJoinQueueSubmit = (e) => {
    e.preventDefault();
    if (!joinModal) return;

    if (!modalVariant.trim()) {
      notify("Please specify a vehicle variant", "error");
      return;
    }
    if (!modalCity.trim()) {
      notify("Please specify a city for regional queue allocation", "error");
      return;
    }

    action(
      () =>
        customerApi.joinQueue(token, {
          carModelId: joinModal.carModelId,
          variant: modalVariant.trim(),
          city: modalCity.trim(),
          preferredDealerId: modalPreferredDealerId || undefined,
          colorPreference: modalColor.trim() || undefined,
        }),
      `Joined waiting queue for ${joinModal.brand} ${joinModal.model} (${modalVariant.trim()} · ${modalCity.trim()})`
    );
    setJoinModal(null);
  };

  return (
    <main className="app-shell">
      {/* Top Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Customer Portal</p>
          <h1>{user?.name || "Customer Workspace"}</h1>
        </div>
        <nav>
          <button className="secondary-action" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="secondary-action" onClick={logout}>
            Sign Out
          </button>
        </nav>
      </header>

      <div className="workspace-content">
        {message && (
          <div
            className={`p-3 rounded-lg text-sm border ${
              messageType === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Consistent Metric Cards */}
        <div className="metric-grid">
          <div className="metric">
            <span>Catalogue Models</span>
            <strong>{realCars.length}</strong>
          </div>
          <div className="metric">
            <span>Available Regional Stock</span>
            <strong className="text-blue-700">{totalStockCount} units</strong>
          </div>
          <div className="metric">
            <span>Active Queues</span>
            <strong className={activeQueues.length > 0 ? "text-blue-700" : ""}>
              {activeQueues.length}
            </strong>
          </div>
          <div className="metric">
            <span>Pending Dealer Offers</span>
            <strong className={pendingOffers.length > 0 ? "text-amber-600" : ""}>
              {pendingOffers.length}
            </strong>
          </div>
          <div className="metric">
            <span>Confirmed Bookings</span>
            <strong className="text-emerald-700">{confirmedBookings.length}</strong>
          </div>
        </div>

        {/* 1. Pending Dealer Offers (High Priority Action) */}
        {pendingOffers.length > 0 && (
          <section className="surface border-amber-200 bg-amber-50/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="text-amber-900 font-bold">
                Action Required: Received Dealer Quotes ({pendingOffers.length})
              </h2>
            </div>
            <p className="section-copy text-amber-800">
              Verified dealerships have allocated physical inventory and submitted itemized on-road pricing for your queue entries. Review breakdowns and decide.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pendingOffers.map((offer) => (
                <div
                  key={offer.offerId}
                  className="p-4 rounded-xl border border-amber-200 bg-white shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-base text-slate-900 font-bold">
                          {offer.dealer?.dealerName || "Authorized Dealership"}
                        </strong>
                        <p className="text-xs text-slate-500 mt-0.5">
                          City: <strong>{offer.dealer?.city || "Regional"}</strong> · Variant:{" "}
                          <strong>{offer.queueEntry?.queue?.variant}</strong> · Color:{" "}
                          <strong>{offer.inventory?.color}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                        Decision Pending
                      </span>
                    </div>

                    <div className="mt-3">
                      <PriceBreakdown pricing={offer} title="Itemized Offer Breakdown" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3">
                    <button
                      className="primary-action flex-1 text-xs"
                      onClick={() =>
                        action(
                          () => customerApi.acceptOffer(token, offer.offerId),
                          "Offer accepted! Booking confirmed with irrevocable price snapshot."
                        )
                      }
                    >
                      Accept & Confirm Booking
                    </button>
                    <button
                      className="danger-action flex-1 text-xs text-center border border-red-200 rounded-md py-1.5"
                      onClick={() =>
                        action(
                          () => customerApi.rejectOffer(token, offer.offerId),
                          "Offer rejected."
                        )
                      }
                    >
                      Reject Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. My Centralized Waiting Queues (Strictly Active: WAITING & OFFERED) */}
        <section className="surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2>My Centralized Waiting Queues ({activeQueues.length})</h2>
              <p className="section-copy">
                Fair First-In, First-Out (FIFO) queue positions across certified regional dealerships. Dealers allocate newly arrived stock to queued customers in sequence.
              </p>
            </div>
            {pastQueues.length > 0 && (
              <button
                className="secondary-action text-xs self-start sm:self-auto"
                onClick={() => setShowQueueHistory(!showQueueHistory)}
              >
                {showQueueHistory ? "Hide Queue History" : `View Queue History (${pastQueues.length})`}
              </button>
            )}
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {activeQueues.map((entry) => (
              <div
                key={entry.entryId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-slate-900 font-bold">
                      {entry.brand} {entry.model}
                    </strong>
                    <span className="text-xs text-slate-600">
                      ({entry.variant} · {entry.city})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        entry.status === "WAITING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {entry.status === "WAITING" ? "Waiting in Line" : "Offer Received"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Preferred Color:{" "}
                    <span className="font-semibold text-slate-700">
                      {entry.colorPreference || "Any Color"}
                    </span>{" "}
                    ·{" "}
                    {entry.status === "WAITING" ? (
                      <>
                        Position in Line:{" "}
                        <span className="font-bold text-blue-700">
                          #{entry.position ?? 1}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        Dealer Quote Received — Action Required Above
                      </span>
                    )}{" "}
                    · Joined:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(entry.joinedAt)}
                    </span>
                  </p>
                </div>

                <div>
                  <button
                    className="danger-action text-xs"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Leave the waiting queue for ${entry.brand} ${entry.model}? Your current queue position will be forfeited.`
                        )
                      ) {
                        action(
                          () => customerApi.leaveQueue(token, entry.queueId),
                          "Left queue successfully"
                        );
                      }
                    }}
                  >
                    Leave Queue
                  </button>
                </div>
              </div>
            ))}

            {activeQueues.length === 0 && (
              <p className="empty-state">
                You do not have any active vehicle waiting queues. Explore available models below to join a queue.
              </p>
            )}
          </div>

          {/* Historical Queue Entries (Collapsible) */}
          {showQueueHistory && pastQueues.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Queue History & Past Requests ({pastQueues.length})
              </h3>
              <div className="space-y-2">
                {pastQueues.map((past) => (
                  <div
                    key={past.entryId}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800">
                          {past.brand} {past.model}
                        </strong>
                        <span className="text-slate-500">
                          ({past.variant} · {past.city})
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            past.status === "BOOKED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {past.status === "BOOKED" ? "Booking Confirmed" : "Left Queue"}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Joined on: {formatDate(past.joinedAt)} · Last updated:{" "}
                        {formatDate(past.updatedAt)}
                      </p>
                    </div>

                    {past.status === "LEFT" && (
                      <button
                        className="secondary-action text-xs py-1 px-2.5 self-start sm:self-auto"
                        onClick={() => openJoinModalFromCar(past)}
                      >
                        Rejoin Queue
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Consolidated Section: Browse Cars & Dealerships */}
        <section className="surface">
          <div className="pb-3 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2>Browse Cars & Dealerships ({filteredCars.length})</h2>
                <p className="section-copy">
                  Discover verified vehicle models and live dealership stock across cities. Compare regional availability, transparent on-road pricing, and join the centralized waiting queue for your preferred configuration.
                </p>
              </div>
            </div>

            {/* Unified Search & Filters */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, model, or variant…"
                className="flex-1 min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              >
                <option value="ALL">All Regional Cities</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              >
                <option value="ALL">All Stock Availability</option>
                <option value="IN_STOCK">In Stock Only</option>
                <option value="NO_STOCK">Catalogue Only (No Stock)</option>
              </select>

              {(search || cityFilter !== "ALL" || availabilityFilter !== "ALL") && (
                <button
                  className="secondary-action text-xs py-1 px-2"
                  onClick={() => {
                    setSearch("");
                    setCityFilter("ALL");
                    setAvailabilityFilter("ALL");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Consolidated Vehicle Cards */}
          <div className="grid gap-6 mt-6">
            {filteredCars.map((car) => {
              // Dealership inventory matching this car and selected city
              const displayedInventory = car.inventory.filter((inv) =>
                cityFilter === "ALL"
                  ? true
                  : inv.dealer?.city?.toLowerCase() === cityFilter.toLowerCase()
              );

              return (
                <article
                  key={car.carModelId}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Top: Vehicle Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-100">
                    {/* Vehicle Photograph */}
                    <div className="md:col-span-4 h-52 md:h-auto bg-slate-100 overflow-hidden relative flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
                      <VehicleImage
                        src={car.imageUrl}
                        alt={`${car.brand} ${car.model}`}
                      />
                    </div>

                    {/* Vehicle Details */}
                    <div className="md:col-span-8 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                              {car.brand}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                              {car.brand} {car.model}
                            </h3>
                          </div>

                          {/* Availability Badge */}
                          {car.totalAvailableStock > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              {car.totalAvailableStock} unit{car.totalAvailableStock > 1 ? "s" : ""} available ({car.dealerCount} dealer{car.dealerCount > 1 ? "s" : ""})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              No physical dealership stock currently
                            </span>
                          )}
                        </div>

                        {/* Known Variants & Specifications */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Stocked Variants:</span>
                          {car.variants.length > 0 ? (
                            car.variants.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                              >
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">
                              Catalogue model — any variant available via queue reservation
                            </span>
                          )}
                        </div>
                      </div>

                      {/* General Queue Join Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-slate-500">
                          {displayedInventory.length > 0
                            ? "Select a dealership inventory item below or join the general waiting queue."
                            : "Join the centralized FIFO waiting queue to receive priority allocations as fresh stock arrives."}
                        </p>
                        <button
                          className="secondary-action text-xs"
                          onClick={() => openJoinModalFromCar(car)}
                        >
                          Join Centralized Waiting Queue
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Dealership Availability & Pricing Inside Same Vehicle Card */}
                  <div className="p-5 bg-slate-50/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                      <span>Participating Dealership Stock</span>
                      <span className="text-slate-400 font-normal">
                        ({displayedInventory.length} option{displayedInventory.length !== 1 ? "s" : ""})
                      </span>
                    </h4>

                    {displayedInventory.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                        {displayedInventory.map((item) => {
                          const isExpanded = expandedPricing[item.inventoryId];
                          return (
                            <div
                              key={item.inventoryId}
                              className="p-4 rounded-lg border border-slate-200 bg-white shadow-xs flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <strong className="text-sm text-slate-900 font-bold">
                                      {item.dealer?.dealerName}
                                    </strong>
                                    <p className="text-xs text-slate-500">
                                      {item.dealer?.city} · {item.dealer?.address}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                    {item.availableUnits} in stock
                                  </span>
                                </div>

                                <div className="mt-2 text-xs text-slate-700 flex items-center gap-2">
                                  <span>
                                    Variant: <strong>{item.variant}</strong>
                                  </span>
                                  <span>·</span>
                                  <span>
                                    Color: <strong>{item.color}</strong>
                                  </span>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                                  <span className="text-xs text-slate-500">Est. On-Road Price:</span>
                                  <strong className="text-sm font-bold text-slate-900">
                                    {formatInr(item.estimatedTotalPrice)}
                                  </strong>
                                </div>

                                {/* Itemized Breakdown Toggle */}
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => togglePricingBreakdown(item.inventoryId)}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    {isExpanded ? "▲ Hide price breakdown" : "▼ View itemized pricing breakdown"}
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                      <PriceBreakdown pricing={item} compact />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <button
                                  className="primary-action w-full text-xs"
                                  onClick={() => openJoinModalFromInventory(item)}
                                >
                                  Join Queue for this Vehicle & Dealer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-white text-center">
                        <p className="text-xs text-slate-500">
                          {cityFilter !== "ALL"
                            ? `No dealerships currently have physical inventory in ${cityFilter}.`
                            : "No regional dealerships currently report physical inventory for this model."}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Joining the centralized waiting queue reserves your FIFO spot across all regional dealerships.
                        </p>
                        <button
                          className="primary-action text-xs mt-3 px-4 py-1.5"
                          onClick={() => openJoinModalFromCar(car)}
                        >
                          Join Centralized Waiting Queue
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {filteredCars.length === 0 && (
              <p className="empty-state col-span-full text-center py-8">
                No matching vehicle models found. Try adjusting your search term or filter criteria.
              </p>
            )}
          </div>
        </section>

        {/* 4. Booking History & Irrevocable Price Snapshots */}
        <section className="surface">
          <h2>Booking History & Price Snapshots ({confirmedBookings.length})</h2>
          <p className="section-copy">
            Confirmed reservations lock in the exact pricing snapshot agreed upon at offer acceptance. Dealership inventory is automatically restored (+1) if a booking is cancelled.
          </p>

          <div className="mt-4 space-y-4">
            {data.bookings.map((booking) => (
              <div
                key={booking.bookingId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-base text-slate-900 font-bold">
                      {booking.inventory?.carModel?.brand} {booking.inventory?.carModel?.model}
                    </strong>
                    <span className="text-xs text-slate-600">
                      ({booking.inventory?.variant} · {booking.inventory?.color})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        booking.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Dealer:{" "}
                    <strong>
                      {booking.dealer?.dealerName ||
                        booking.inventory?.dealer?.dealerName ||
                        "Authorized Dealer"}
                    </strong>{" "}
                    · City:{" "}
                    {booking.dealer?.city || booking.inventory?.dealer?.city || "Regional"} · Booking Date:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(booking.createdAt)}
                    </span>
                  </p>

                  <div className="mt-3">
                    <PriceBreakdown
                      pricing={booking.priceSnapshot || { totalPrice: booking.totalPrice }}
                      title="Irrevocable Booking Snapshot"
                      compact
                    />
                  </div>
                </div>

                <div>
                  {booking.status === "CONFIRMED" && (
                    <button
                      className="danger-action text-xs border border-red-200 rounded-md px-3 py-1.5"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancel this booking? Inventory will be released back to the dealership."
                          )
                        ) {
                          action(
                            () => customerApi.cancelBooking(token, booking.bookingId),
                            "Booking cancelled successfully. Inventory restored."
                          );
                        }
                      }}
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>
            ))}

            {data.bookings.length === 0 && (
              <p className="empty-state">No vehicle bookings on record.</p>
            )}
          </div>
        </section>
      </div>

      {/* Enhanced Join Queue Modal */}
      {joinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-lg max-h-[90vh] overflow-y-auto">
            {joinModal.imageUrl && (
              <div className="w-full h-36 rounded-lg overflow-hidden mb-4 bg-slate-100">
                <VehicleImage
                  src={joinModal.imageUrl}
                  alt={`${joinModal.brand} ${joinModal.model}`}
                />
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900">
              Join Centralized Waiting Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {joinModal.brand} {joinModal.model}
            </p>

            <form className="mt-4 space-y-3.5" onSubmit={handleJoinQueueSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Variant <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accomplished, Fearless, SX, or Standard"
                  value={modalVariant}
                  onChange={(e) => setModalVariant(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Region <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai, Pune, Delhi, Bengaluru"
                  value={modalCity}
                  onChange={(e) => setModalCity(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Queues are organized regionally per city.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Dealership (Optional)
                </label>
                <select
                  value={modalPreferredDealerId}
                  onChange={(e) => setModalPreferredDealerId(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  <option value="">No preference (Any participating dealership in region)</option>
                  {joinModal.availableDealers?.map((dealer) => (
                    <option key={dealer.dealerId} value={dealer.dealerId}>
                      {dealer.dealerName} ({dealer.city})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Leaving this open allows any participating regional dealership to allocate stock to you faster.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Exterior Color (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pearl White, Magma Grey, or leave blank for Any"
                  value={modalColor}
                  onChange={(e) => setModalColor(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  className="secondary-action text-xs"
                  onClick={() => setJoinModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action text-xs">
                  Confirm & Join FIFO Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
