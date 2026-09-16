import { prisma } from "../../lib/prisma";
import { notFound } from "next/navigation";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-500">Checkout</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Review your order and complete payment using cryptocurrency.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Country</span>
              <span className="text-white">{product.country}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Domain TLD</span>
              <span className="text-white">{product.tld}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Detected Hosting</span>
              <span className="text-white">{product.hosting}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Seller</span>
              <span className="text-white">{product.seller.username}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Check Status</span>
              <span className="text-white">
                {product.checkStatus === "Valid" ? "✅ Valid" : "⏳ Checking"}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-green-500">${product.price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Payment</h3>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-red-500">
              Select Cryptocurrency
            </label>
            <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none">
              <option>Bitcoin (BTC)</option>
              <option>Ethereum (ETH)</option>
              <option>Tether (USDT - TRC20)</option>
              <option>Tether (USDT - ERC20)</option>
            </select>
          </div>

          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">You will pay approximately:</p>
            <p className="mt-1 text-2xl font-bold text-white">0.000198 BTC</p>
            <p className="mt-1 text-xs text-zinc-500">= ${product.price.toFixed(2)} USD</p>
          </div>

          <a
            href={`/checkout/${product.id}/pay`}
            className="block w-full rounded-md bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-red-500"
          >
            Pay with Crypto →
          </a>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Payment is processed securely via our crypto provider.
          </p>
        </div>
      </div>
    </div>
  );
}