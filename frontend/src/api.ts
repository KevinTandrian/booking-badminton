const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Terjadi kesalahan");
    return data as T;
}