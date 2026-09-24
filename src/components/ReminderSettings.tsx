"use client";

// The reminder controls on a goal's Info tab: when this goal's sub-tasks
// remind you, and whether this device receives the reminders at all.

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Send, X, Smartphone } from "lucide-react";
import { reminderSettings, type Goal, type ReminderSettings as Settings } from "@/lib/goals";
import { allReminders, formatOffset } from "@/lib/reminders";
import { deviceStatus, disablePush, enablePush, sendTestPush, type DeviceStatus } from "@/lib/push";

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">{children}</div>
);

const chip =
  "px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase transition-colors";
const chipHover = "hover:border-emerald-500/30 hover:text-emerald-400";
const chipOn = "px-2.5 py-1 border text-[10px] font-bold uppercase transition-colors bg-emerald-500/15 border-emerald-500/50 text-emerald-400";

const PRESETS = [0, 10, 30, 60, 180, 1440, 2880];
const UNITS = { m: 1, h: 60, d: 1440 } as const;

const presetLabel = (min: number) =>
  min === 0 ? "At due" : min % 1440 === 0 ? `${min / 1440}d` : min % 60 === 0 ? `${min / 60}h` : `${min}m`;

const fmtWhen = (epoch: number) =>
  `${new Date(epoch).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} ${new Date(
    epoch
  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;

// --- this goal --------------------------------------------------------------

interface GoalRemindersProps {
  goal: Goal;
  onChange: (next: Settings) => void;
}

export function GoalReminders({ goal, onChange }: GoalRemindersProps) {
  const settings = reminderSettings(goal);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<keyof typeof UNITS>("m");

  // Refreshed once a minute so "next reminder" moves on by itself.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(i);
  }, []);

  const toggleOffset = (min: number) => {
    const has = settings.offsets.includes(min);
    onChange({ ...settings, offsets: has ? settings.offsets.filter((o) => o !== min) : [...settings.offsets, min] });
  };

  const addCustom = () => {
    const n = Number(amount);
    if (!(n > 0)) return;
    const min = Math.round(n * UNITS[unit]);
    if (!settings.offsets.includes(min)) onChange({ ...settings, offsets: [...settings.offsets, min] });
    setAmount("");
  };

  // The next reminder for each open sub-task that has a deadline.
  const nextBySub = new Map<string, { sub: string; fireAt: number; offset: number }>();
  for (const r of allReminders([{ ...goal, reminders: { ...settings, enabled: true } }])) {
    if (r.fireAt <= now) continue;
    const cur = nextBySub.get(r.subId);
    if (!cur || r.fireAt < cur.fireAt) nextBySub.set(r.subId, r);
  }
  const upcoming = [...nextBySub.values()].sort((a, b) => a.fireAt - b.fireAt);

  const withDeadline = (goal.subgoals ?? []).filter((sg) => !sg.completed && sg.deadline).length;
  const custom = settings.offsets.filter((o) => !PRESETS.includes(o));

  return (
    <div>
      <Label>
        <span className="inline-flex items-center gap-1.5">
          <Bell size={9} /> Sub-task reminders
        </span>
      </Label>

      <div className="flex gap-1">
        <button
          onClick={() => onChange({ ...settings, enabled: true })}
          className={`flex-1 py-2 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
            settings.enabled
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
              : "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
          }`}
        >
          <BellRing size={11} /> Remind me
        </button>
        <button
          onClick={() => onChange({ ...settings, enabled: false })}
          className={`flex-1 py-2 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
            !settings.enabled
              ? "bg-zinc-100/10 text-zinc-100 border-zinc-400/50"
              : "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
          }`}
        >
          <BellOff size={11} /> Silent
        </button>
      </div>

      {settings.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] text-zinc-600 mb-1.5">Remind me before each sub-task is due:</div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((min) => (
                <button
                  key={min}
                  onClick={() => toggleOffset(min)}
                  aria-pressed={settings.offsets.includes(min)}
                  className={settings.offsets.includes(min) ? chipOn : `${chip} ${chipHover}`}
                >
                  {presetLabel(min)}
                </button>
              ))}
              {custom.map((min) => (
                <button
                  key={min}
                  onClick={() => toggleOffset(min)}
                  title="Remove"
                  className={`${chipOn} inline-flex items-center gap-1`}
                >
                  {presetLabel(min)} <X size={9} />
                </button>
              ))}
            </div>
            <div className="flex items-stretch mt-2">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="custom"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                className="w-20 bg-black border border-zinc-800 border-r-0 px-2 py-1 text-[10px] font-mono text-zinc-300 outline-none focus:border-emerald-500/50 placeholder:text-zinc-700"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as keyof typeof UNITS)}
                aria-label="Unit"
                className="bg-black border border-zinc-800 border-r-0 px-1.5 text-[10px] font-mono text-zinc-400 outline-none"
              >
                <option value="m">min</option>
                <option value="h">hours</option>
                <option value="d">days</option>
              </select>
              <button onClick={addCustom} className={`${chip} ${chipHover}`}>
                Add
              </button>
            </div>
            {settings.offsets.length === 0 && (
              <p className="mt-2 text-[10px] text-yellow-500/80">Pick at least one time, or nothing will be sent.</p>
            )}
          </div>

          <div className="p-3 border border-zinc-800 bg-zinc-900/30">
            {upcoming.length ? (
              <ul className="space-y-1.5">
                {upcoming.map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[11px] font-mono">
                    <span className="text-zinc-400 truncate">{r.sub}</span>
                    <span className="text-zinc-600 shrink-0">
                      {fmtWhen(r.fireAt)} · {formatOffset(r.offset).toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                {withDeadline
                  ? "Nothing left to remind you of: every reminder time for these deadlines has passed."
                  : "No open sub-task has a deadline yet. Give one a Due time from its options (the sliders button) and it will show up here."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- this device ------------------------------------------------------------

const STATUS_TEXT: Record<DeviceStatus, string> = {
  unsupported: "This browser cannot receive notifications.",
  "needs-install":
    "On iPhone, reminders only reach the installed app: tap Share, then Add to Home Screen, and open Genesis from there.",
  denied: "Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.",
  off: "This device does not receive reminders yet.",
  on: "This device receives reminders, even with the app closed.",
};

export function DeviceReminders({ adminKey }: { adminKey: string }) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [devices, setDevices] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    deviceStatus().then((s) => live && setStatus(s)).catch(() => live && setStatus("unsupported"));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    let live = true;
    fetch("/api/push", { headers: { "x-admin-key": adminKey }, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        if (typeof d?.devices === "number") setDevices(d.devices);
        if (d && d.configured === false) setNote({ text: "Push is not set up on the server yet (VAPID keys missing).", bad: true });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [adminKey, status]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch (err) {
      setNote({ text: (err as Error).message || "Something went wrong.", bad: true });
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () =>
    act(async () => {
      const s = await enablePush(adminKey);
      setStatus(s);
      if (s === "on") setNote({ text: "Done. Send a test to check it arrives." });
    });

  const turnOff = () => act(async () => setStatus(await disablePush(adminKey)));

  const test = () =>
    act(async () => {
      const r = await sendTestPush(adminKey);
      setNote(
        r.sent
          ? { text: `Sent to ${r.sent} device${r.sent === 1 ? "" : "s"}.` }
          : { text: "No device took the test. Turn reminders off and on again here.", bad: true }
      );
    });

  if (!status) return null;

  return (
    <div>
      <Label>
        <span className="inline-flex items-center gap-1.5">
          <Smartphone size={9} /> Notifications on this device
        </span>
      </Label>
      <div className="p-3 border border-zinc-800 bg-zinc-900/30 space-y-2.5">
        <p className={`text-[10px] leading-relaxed ${status === "on" ? "text-emerald-500/90" : "text-zinc-500"}`}>
          {STATUS_TEXT[status]}
          {devices !== null && devices > 0 && (
            <span className="text-zinc-700">
              {" "}
              ({devices} device{devices === 1 ? "" : "s"} signed up.)
            </span>
          )}
        </p>
        {status === "off" && (
          <button
            onClick={turnOn}
            disabled={busy}
            className="w-full py-2 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <BellRing size={11} /> {busy ? "Turning on…" : "Turn on for this device"}
          </button>
        )}
        {status === "on" && (
          <div className="flex gap-1">
            <button onClick={test} disabled={busy} className={`flex-1 inline-flex items-center justify-center gap-1.5 ${chip} ${chipHover} disabled:opacity-50`}>
              <Send size={10} /> Send test
            </button>
            <button
              onClick={turnOff}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 ${chip} hover:border-red-500/30 hover:text-red-400 disabled:opacity-50`}
            >
              <BellOff size={10} /> Turn off
            </button>
          </div>
        )}
        {note && <p className={`text-[10px] ${note.bad ? "text-red-400" : "text-zinc-500"}`}>{note.text}</p>}
      </div>
    </div>
  );
}
