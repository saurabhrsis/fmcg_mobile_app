# FMCG Mobile — Licensing

The mobile app uses the **same licensing scheme as the FMCG/RightServe desktop
software** ([fmcg_software](https://github.com/nitesh1414/fmcg_software)), so a single
portal issues keys for both products.

| Concern | Desktop | Mobile (this app) |
|---|---|---|
| Key format | `RSL1.<b64url(payload)>.<b64url(sig)>` | identical |
| Signature | ed25519, verified offline with shipped public key | identical (`@noble/ed25519`) |
| Key generator | `portal/server/licensing.js` + `tools/license-gen.js` | **same portal, no changes needed** |
| Activation endpoint | `POST <act>/api/activate` | same endpoint, same payload |
| Storage | files under `<userData>` | `app_meta` table in SQLite |
| Grace behaviour | read-only after expiry | read-only after expiry **and** after trial |
| Free trial | — | **7 days**, granted on first launch |
| `product` field | rejects `mobile` keys | rejects `desktop` keys (untagged legacy keys count as desktop) |

## Key payload

Exactly the payload minted by `portal/server/licensing.js`:

```json
{
  "v": 1, "id": "RS-XXXXXXXX", "client": "Apex FMCG Distributors",
  "plan": "Premium", "product": "mobile", "issued": "2026-09-03", "expires": "2027-09-03",
  "machine": null, "reminderDays": 15, "notes": "",
  "online": true, "act": "https://portal.example.com"
}
```

- `expires: null` → perpetual licence (never warns, never locks).
- `machine` → locks the key to one device (the app's **Device ID**, shown on the
  Activation screen and shareable via the share sheet).
- `product` → which app the key unlocks: `"desktop"`, `"mobile"` or `"both"`. Keys minted
  before the portal wrote this field have no `product` and are treated as **desktop** keys
  (see below).
- `online: true` + `act` → the key is claimed once at the portal, which binds it to one
  device. A local **seal** is then stored so every later launch is fully offline.

## Desktop vs Mobile keys

Activation binds **one device**, so a single key cannot unlock both the PC and the phone —
they are different products in the portal.

| Customer buys | What to generate |
|---|---|
| Desktop only | Product = **Desktop app** → 1 key |
| Mobile only | Product = **Mobile app** → 1 key |
| Both at once | Product = **Desktop + Mobile** → **2 keys**, same client, same term |
| Mobile now, desktop later (or vice versa) | Same **client** in the portal → generate the missing product. Never reuse the first key. |

- **Desktop key** → paste on the PC activation screen. The desktop app **rejects**
  `product: "mobile"`.
- **Mobile key** → paste in this app. `licenseProduct()` / `isMobileProduct()` in
  `src/licensing/license.ts` accept `"mobile"` and `"both"`, and reject `"desktop"` (and
  untagged legacy keys) with: *“This key is for the RightServe desktop app. Ask RightServe
  for a Mobile license.”* The check runs in both `evaluate()` and `installLicenseKey()`,
  so an already-installed desktop key also drops the app into read-only `invalid` state.
- **Legacy keys with no `product`** are treated as desktop keys — backward compatible with
  the desktop app, which is what every untagged key in the field was minted for. If you
  still support customers on untagged keys on mobile, mint them a proper Mobile key rather
  than relaxing this gate.
- **Renewals** are per product: renew the Desktop and the Mobile row separately in License
  History.
- **Transfer / reset activation** is per key, so a new phone and a new PC are two separate
  resets.
- Licence keys never link two databases — Desktop ↔ Mobile data movement is done by the
  sync/pairing flow (Settings → Desktop Sync → **Scan QR to connect**).

## Public key

`src/licensing/publicKey.ts` embeds the same public key as
`desktop/license_public.pem`. **If the key pair is ever regenerated, update this file too**
or all previously issued keys stop working on mobile.

## States and behaviour

| State | Meaning | Writes allowed |
|---|---|---|
| `trial` | within the 7-day trial | ✅ |
| `trial-expiring` | ≤ 3 days of trial left (banner warning) | ✅ |
| `trial-expired` | trial over, no key | ❌ read-only |
| `active` | valid licence | ✅ |
| `expiring` | ≤ `reminderDays` (default 15) to expiry | ✅ (with banner) |
| `expired` | licence lapsed | ❌ read-only |
| `needs-activation` | online key not yet claimed on this device | ❌ read-only |
| `invalid` | tampered key, or locked to another device | ❌ read-only |

Read-only mode still permits viewing, searching, PDF/print export and backups — it only
blocks create/edit/delete, matching the desktop read-only middleware.

## Anti-tamper

- **Signature check** — any edit to a key fails verification.
- **Clock rollback** — the highest date ever seen is stored in `app_meta`, so setting the
  device clock back cannot revive an expired trial or licence.
- **Trial reset** — the trial start date and device id live in the app database; clearing
  them requires reinstalling (and the portal's one-device binding still applies to keys).
- **Copying an activated install** — the activation seal is device-bound and the portal
  rejects a second device for the same key.

## Files

| File | Purpose |
|---|---|
| `src/licensing/license.ts` | verify / evaluate / activate / trial logic |
| `src/licensing/licenseStore.ts` | device id, key, seal, trial start, monotonic clock |
| `src/licensing/publicKey.ts` | shipped ed25519 public key |
| `src/context/LicenseContext.tsx` | app-wide status + `ensureWritable()` write guard |
| `src/components/layout/LicenseBanner.tsx` | top status strip |
| `src/screens/license/ActivationScreen.tsx` | paste-a-key activation gate |
| `src/screens/license/LicenseScreen.tsx` | More → License & Subscription |

## Issuing a key for a mobile client

Use the existing portal (or `tools/license-gen.js`) exactly as for desktop:

```bash
# Mobile key for this app (product is what the phone checks)
node tools/license-gen.js --client "Apex FMCG Distributors" --days 365 --product mobile
# device-locked (ask the client for the Device ID on the Activation screen)
node tools/license-gen.js --client "Apex" --days 365 --product mobile --machine A1B2-C3D4-E5F6-7890
# customer wants both apps → two keys for the same client
node tools/license-gen.js --client "Apex" --days 365 --product desktop
node tools/license-gen.js --client "Apex" --days 365 --product mobile
```
