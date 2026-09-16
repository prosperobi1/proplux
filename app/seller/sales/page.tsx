export default function SellerSalesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-red-600">My Sales</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Earnings</p>
          <p className="mt-2 text-3xl font-bold text-green-500">$0.00</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Available to Withdraw</p>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Sales</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-red-500">Recent Sales</h3>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr className="text-left text-xs font-semibold uppercase text-red-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Your Cut (65%)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="bg-zinc-950">
                <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                  No sales yet. Add products to your store to start earning.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}