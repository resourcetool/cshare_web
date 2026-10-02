// Vercel function: sends the web reminders that are due (replaces the Firebase scheduled function, which
// needs the paid Blaze plan). A free scheduler (cron-job.org) calls this address every minute.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function init() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const given = bearer || (req.query && req.query.key) || "";
  if (!secret || given !== secret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    init();
    const db = getFirestore();
    const due = await db
      .collectionGroup("webReminders")
      .where("fireAt", "<=", Timestamp.now())
      .orderBy("fireAt")
      .limit(300)
      .get();

    if (due.empty) {
      res.status(200).json({ due: 0, sent: 0 });
      return;
    }

    const tooLateMs = Date.now() - 2 * 60 * 60 * 1000; // never send a reminder that is hours late
    const remove = [];
    const send = [];
    due.docs.forEach((d) => {
      const late = d.get("fireAt").toMillis() < tooLateMs;
      if (!d.get("token") || late) remove.push(d.ref);
      else send.push(d);
    });

    let sent = 0;
    if (send.length) {
      const result = await getMessaging().sendEach(
        send.map((d) => ({
          token: d.get("token"),
          data: {
            type: "reminder",
            title: String(d.get("title") || "CSHARE"),
            body: String(d.get("body") || ""),
            tag: d.id,
            assignmentId: String(d.get("assignmentId") || ""),
            callStyle: d.get("callStyle") === true ? "true" : "false",
          },
          webpush: { headers: { Urgency: "high", TTL: "3600" } },
        })),
      );
      const cleanups = [];
      result.responses.forEach((r, i) => {
        const d = send[i];
        if (r.success) {
          sent += 1;
          remove.push(d.ref);
          return;
        }
        const code = (r.error && r.error.code) || "";
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          remove.push(d.ref); // this browser no longer exists
          const userRef = d.ref.parent.parent;
          if (userRef) cleanups.push(userRef.update({ fcmTokens: FieldValue.arrayRemove(d.get("token")) }).catch(() => undefined));
        }
        // any other error: keep it; the next minute tries again until it is too late to matter
      });
      await Promise.all(cleanups);
    }

    for (let i = 0; i < remove.length; i += 400) {
      const batch = db.batch();
      remove.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    res.status(200).json({ due: due.size, sent, removed: remove.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
