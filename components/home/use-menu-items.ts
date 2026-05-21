"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MENU_ITEMS, groupMenuItems, type MenuItem } from "@/lib/menu/catalog";

type MenuApiResponse = {
  data?: MenuItem[];
};

export function useMenuItems() {
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/menu-items", { cache: "no-store" });
      const data = (await response.json()) as MenuApiResponse & { error?: string };
      if (!response.ok || !Array.isArray(data.data)) {
        throw new Error(data.error || "Cannot load menu items");
      }

      setItems(data.data.length > 0 ? data.data : DEFAULT_MENU_ITEMS);
    } catch (fetchError) {
      setItems(DEFAULT_MENU_ITEMS);
      setError(fetchError instanceof Error ? fetchError.message : "Cannot load menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return {
    items,
    loading,
    error,
    ...groupMenuItems(items),
    refresh,
  };
}
