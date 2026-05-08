import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Role } from "@/lib/types";

export interface StaffUser {
    uid: string;
    role: Role;
    active: boolean;
    email?: string;
    displayName?: string;
}

interface State {
    users: StaffUser[];
    loading: boolean;
    error: Error | null;
}

export function useStaffUsers(): State {
    const [state, setState] = useState<State>({
        users: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("role"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const users = snap.docs.map((d) => d.data() as StaffUser);
                setState({ users, loading: false, error: null });
            },
            (err) => setState((s) => ({ ...s, loading: false, error: err })),
        );
        return unsub;
    }, []);

    return state;
}
