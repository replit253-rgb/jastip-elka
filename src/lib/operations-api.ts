export type PackageRecord = {
  id: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone?: string;
  sender_name?: string;
  destination: string;
  description?: string;
  weight_kg: string | number;
  price_per_kg?: number;
  total_price: number;
  verified_at: string | null;
  paid_at: string | null;
  collected_at: string | null;
  created_at: string;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new Error("Layanan API ELKANA tidak dapat dihubungi.", { cause });
  }
  if (response.status === 204) return undefined as T;
  let result: T & { error?: string };
  try {
    result = (await response.json()) as T & { error?: string };
  } catch (cause) {
    if (!response.ok) {
      throw new Error(`Layanan API tidak tersedia (HTTP ${response.status}).`, { cause });
    }
    throw new Error("Respons API tidak valid.", { cause });
  }
  if (!response.ok) throw new Error(result.error ?? `Permintaan gagal (${response.status}).`);
  return result;
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
