"use client";

import { useEffect, useState } from "react";
import { minVisible } from "@/lib/ui";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Eye, EyeOff } from "lucide-react";

type FieldDef = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  visible?: boolean;
  preview?: string;
  placeholder?: string;
  options?: string[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
  sellOnce: boolean;
  fields: FieldDef[];
};

const TYPES = [
  "text",
  "number",
  "textarea",
  "select",
  "country",
  "expiry",
  "sample_text",
  "image_urls",
];

function autoName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function CategoryFieldsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [sellOnce, setSellOnce] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/categories/${id}/fields`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setCategory(d);
        setFields(Array.isArray(d.fields) ? d.fields : []);
        setSellOnce(d.sellOnce);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const addField = () => {
    setFields([
      ...fields,
      { name: "", label: "", type: "text", required: false, visible: true, preview: "" },
    ]);
  };

  const updateField = (idx: number, patch: Partial<FieldDef>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx: number) => {
    if (!confirm("Remove this field? Existing product data for this field will be orphaned.")) return;
    setFields(fields.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  };

  const save = async () => {
    setError(null);

    // Validate
    for (const f of fields) {
      if (!f.label.trim()) { setError("Every field needs a label"); return; }
      if (!f.name.trim()) { setError(`Field "${f.label}" has no name`); return; }
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        setError(`Field "${f.label}" is a dropdown but has no options`);
        return;
      }
    }

    // Check duplicate names
    const names = fields.map((f) => f.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      setError(`Duplicate field names: ${[...new Set(dupes)].join(", ")}`);
      return;
    }

    const vis = minVisible();

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, sellOnce }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      await vis();
      setSaving(false);
    }
  };

  if (loading) return (
   <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
     <Loader2 className="h-4 w-4 animate-spin" /> Loading...
   </div>
 );
  if (!category) return <div className="p-8 text-red-500">{error || "Category not found"}</div>;

  const labelCol = "px-3 py-3 text-xs";
  const inputCls = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none";
  const smallInputCls = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/categories" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Categories
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{category.name} · Fields</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Configure what sellers fill in when listing a <strong>{category.name}</strong> product.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
            saved ? "bg-green-600" : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Fields"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Sell once toggle */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Sell Once</p>
          <p className="text-xs text-zinc-500">
            If ON, this product disappears after the first purchase. Logins = ON. Files/Leads = OFF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSellOnce(!sellOnce)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${sellOnce ? "bg-red-600" : "bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${sellOnce ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Fields table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="w-12 px-3 py-3">#</th>
              <th className="px-3 py-3">Label</th>
              <th className="px-3 py-3">Name (auto)</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3 w-20">Req.</th>
              <th className="px-3 py-3 w-24">Visible</th>
              <th className="px-3 py-3">Preview (if hidden)</th>
              <th className="w-24 px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {fields.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  No fields yet. Click <strong>Add Field</strong> below to start.
                </td>
              </tr>
            ) : (
              fields.map((f, i) => (
                <>
                  <tr key={i}>
                    <td className="px-3 py-3 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          const autoN = f.name && f.name !== autoName(f.label) ? f.name : autoName(label);
                          updateField(i, { label, name: autoN });
                        }}
                        placeholder="IP/Host"
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => updateField(i, { name: e.target.value })}
                        placeholder="ip"
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={f.type}
                        onChange={(e) => updateField(i, { type: e.target.value })}
                        className={inputCls}
                      >
                        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => updateField(i, { required: e.target.checked })}
                        className="h-4 w-4 cursor-pointer accent-red-600"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => updateField(i, { visible: f.visible === false ? true : false })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          f.visible !== false ? "bg-green-950 text-green-500" : "bg-zinc-800 text-zinc-500"
                        }`}
                        title={f.visible !== false ? "Buyer sees the value" : "Buyer sees *** until purchase"}
                      >
                        {f.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      {f.visible === false ? (
                        <input
                          type="text"
                          value={f.preview || ""}
                          onChange={(e) => updateField(i, { preview: e.target.value })}
                          placeholder="***"
                          className={`${inputCls} text-xs`}
                        />
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => move(i, "up")} disabled={i === 0} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1 hover:bg-zinc-700 disabled:opacity-20">
                          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                        <button onClick={() => move(i, "down")} disabled={i === fields.length - 1} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1 hover:bg-zinc-700 disabled:opacity-20">
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                        <button onClick={() => removeField(i)} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1 hover:bg-zinc-700">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {f.type === "select" && (
                    <tr key={`${i}-options`}>
                      <td />
                      <td colSpan={7} className="px-3 pb-3">
                        <input
                          type="text"
                          value={(f.options || []).join(", ")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateField(i, { options: raw.split(",").map((s) => s.trim()).filter(Boolean) });
                          }}
                          placeholder="Options (comma-separated): VISA, MASTERCARD, AMEX"
                          className={smallInputCls}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={addField}
        className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" /> Add Field
      </button>

      {saved && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3 text-sm text-green-500">
          Fields saved successfully.
        </div>
      )}
    </div>
  );
}
