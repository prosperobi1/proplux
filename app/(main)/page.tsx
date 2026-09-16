export default function Home() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-500">Hello Prospec</h2>
        <p className="mt-2 text-sm text-zinc-400">
          If you have any <span className="text-red-400">Question, Problem, Suggestion or Request</span> Please feel free to{" "}
          <a href="#" className="font-medium text-red-500 underline">Open a Ticket</a>
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          If you want to report an order, just go to <span className="text-red-400">My Orders</span> then click on{" "}
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white">Report #[Order Id]</span> button
        </p>
        <p className="mt-4 text-sm font-medium text-red-400">
          Our Domains are Proplux.shop - Please Save them!
        </p>
      </div>

      {/* News Section */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-500">
          <span>📰</span> News
        </h3>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">No news available at the moment.</p>
        </div>
      </div>
    </div>
  );
}