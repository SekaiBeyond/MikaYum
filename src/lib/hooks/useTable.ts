import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Table } from "@/lib/types";

interface TableState {
    table: Table | null;
    loading: boolean;
    error: Error | null;
    exists: boolean;
}

const initial: TableState = {
    table: null,
    loading: true,
    error: null,
    exists: false,
};

export function useTable(tableId: string | undefined): TableState {
    const [state, setState] = useState<TableState>(initial);

    useEffect(() => {
        if (!tableId) {
            setState({ ...initial, loading: false });
            return;
        }
        const unsub = onSnapshot(
            doc(db, "tables", tableId),
            (snap) => {
                if (!snap.exists()) {
                    setState({ table: null, loading: false, error: null, exists: false });
                    return;
                }
                setState({
                    table: snap.data() as Table,
                    loading: false,
                    error: null,
                    exists: true,
                });
            },
            (err) =>
                setState((s) => ({ ...s, loading: false, error: err, exists: false })),
        );
        return unsub;
    }, [tableId]);

    return state;
}
