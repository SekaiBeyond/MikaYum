import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category, MenuItem } from "@/lib/types";

interface MenuState {
  categories: Category[];
  itemsByCategory: Record<string, MenuItem[]>;
  itemsById: Record<string, MenuItem>;
  loading: boolean;
  error: Error | null;
}

const initial: MenuState = {
  categories: [],
  itemsByCategory: {},
  itemsById: {},
  loading: true,
  error: null,
};

export function useMenu(): MenuState {
  const [state, setState] = useState<MenuState>(initial);

  useEffect(() => {
    const catQ = query(collection(db, "categories"), orderBy("sortOrder"));
    const itemQ = query(collection(db, "menuItems"), orderBy("sortOrder"));

    let categories: Category[] = [];
    let items: MenuItem[] = [];
    let gotCats = false;
    let gotItems = false;

    function flush() {
      if (!gotCats || !gotItems) return;
      const itemsByCategory: Record<string, MenuItem[]> = {};
      const itemsById: Record<string, MenuItem> = {};
      for (const item of items) {
        itemsById[item.id] = item;
        (itemsByCategory[item.category] ??= []).push(item);
      }
      setState({
        categories,
        itemsByCategory,
        itemsById,
        loading: false,
        error: null,
      });
    }

    const unsubCats = onSnapshot(
      catQ,
      (snap) => {
        categories = snap.docs.map((d) => d.data() as Category);
        gotCats = true;
        flush();
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );

    const unsubItems = onSnapshot(
      itemQ,
      (snap) => {
        items = snap.docs.map((d) => d.data() as MenuItem);
        gotItems = true;
        flush();
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );

    return () => {
      unsubCats();
      unsubItems();
    };
  }, []);

  return state;
}
