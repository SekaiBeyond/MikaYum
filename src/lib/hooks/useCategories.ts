import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category } from "@/lib/types";

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const q = query(collection(db, "categories"), orderBy("sortOrder"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setCategories(snap.docs.map((d) => d.data() as Category));
                setLoading(false);
            },
            (err) => {
                setError(err);
                setLoading(false);
            },
        );
        return unsub;
    }, []);

    return { categories, loading, error };
}
