import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Table } from "@/lib/types";

interface State {
  tables: Table[];
  loading: boolean;
  error: Error | null;
}

const initial: State = { tables: [], loading: true, error: null };

export function useStaffTables(): State {
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    const q = query(collection(db, "tables"), orderBy("label"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const tables = snap.docs.map((d) => d.data() as Table);
        setState({ tables, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
