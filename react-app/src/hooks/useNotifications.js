import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function useNotifications(uid) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    setLoading(true);
    setError(null);
    const notificationsRef = collection(db, "users", uid, "notifications");

    return onSnapshot(
      query(notificationsRef, orderBy("created", "desc")),
      (snapshot) => {
        setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (listenerError) => {
        console.error("Notifications listener error:", listenerError);
        setError("Unable to load notifications.");
        setLoading(false);
      },
    );
  }, [uid]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const oldRead = useMemo(
    () => notifications.filter((item) => item.read && item.created && Date.now() - item.created > RETENTION_MS),
    [notifications],
  );

  const markRead = (id) => updateDoc(doc(db, "users", uid, "notifications", id), { read: true });

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !item.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((item) => batch.update(doc(db, "users", uid, "notifications", item.id), { read: true }));
    await batch.commit();
  };

  const clearOld = async () => {
    if (oldRead.length === 0) return;
    const batch = writeBatch(db);
    oldRead.forEach((item) => batch.delete(doc(db, "users", uid, "notifications", item.id)));
    await batch.commit();
  };

  const deleteNotification = (id) => deleteDoc(doc(db, "users", uid, "notifications", id));

  return { notifications, unreadCount, oldReadCount: oldRead.length, loading, error, markRead, markAllRead, clearOld, deleteNotification };
}
