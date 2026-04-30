import { Router } from "express";
import { db, vehiclesTable, scanAlertsTable, usersTable, sosProfilesTable, accidentReportsTable, lostItemsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { validateScreenshot } from "../lib/imageValidation";

const router = Router();

// Validate an array of photo data-URLs sent in JSON. Returns the cleaned
// array (sliced to maxCount) or a user-facing error string.
//
// Allowed formats are strictly JPG/JPEG/PNG/WEBP — we delegate the heavy
// magic-byte / size check to validateScreenshot() and then add an extra
// MIME whitelist on top to exclude GIF (which validateScreenshot otherwise
// accepts) so the backend matches the frontend's accept= attribute.
const ALLOWED_PHOTO_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
];

function validatePhotoArray(
  input: unknown,
  maxCount: number,
): { ok: true; photos: string[] } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, photos: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "photos must be an array" };
  }
  const sliced = input.slice(0, maxCount);
  const out: string[] = [];
  for (let i = 0; i < sliced.length; i++) {
    const entry = sliced[i];
    if (typeof entry !== "string" || !ALLOWED_PHOTO_PREFIXES.some((p) => entry.startsWith(p))) {
      return { ok: false, error: `Photo ${i + 1} must be a JPEG, PNG, or WEBP image` };
    }
    const err = validateScreenshot(entry);
    if (err) {
      // Replace "Screenshot" framing with user-facing "Photo N"
      const friendly = err.replace(/^Screenshot/, `Photo ${i + 1}`);
      return { ok: false, error: friendly };
    }
    out.push(entry);
  }
  return { ok: true, photos: out };
}

// ─── Helper: resolve vehicle by QR ──────────────────────────────────────────

async function resolveVehicle(qrCode: string) {
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.qrCode, qrCode), eq(vehiclesTable.qrActive, true)));
  return vehicle ?? null;
}

// GET /api/public/vehicle/:qrCode
router.get("/public/vehicle/:qrCode", async (req, res) => {
  const { qrCode } = req.params;
  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const publicInfo: Record<string, unknown> = {
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      privacyMode: vehicle.privacyMode,
      qrCode: vehicle.qrCode,
    };

    if (!vehicle.privacyMode) {
      publicInfo.brand = vehicle.brand;
      publicInfo.model = vehicle.model;
      publicInfo.color = vehicle.color;
      publicInfo.ownerName = vehicle.ownerName;
    } else {
      publicInfo.ownerName = vehicle.ownerName.split(" ")[0] + ".";
    }

    if (vehicle.preferredContactMethod === "call" || vehicle.preferredContactMethod === "both") {
      publicInfo.primaryContact = vehicle.primaryContact;
    }
    if (vehicle.preferredContactMethod === "whatsapp" || vehicle.preferredContactMethod === "both") {
      publicInfo.whatsappNumber = vehicle.whatsappNumber;
    }
    publicInfo.preferredContactMethod = vehicle.preferredContactMethod;

    res.json(publicInfo);
  } catch (err) {
    req.log.error(err, "Failed to fetch public vehicle");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/public/vehicle/:qrCode/sos
router.get("/public/vehicle/:qrCode/sos", async (req, res) => {
  const { qrCode } = req.params;
  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const [profile] = await db
      .select()
      .from(sosProfilesTable)
      .where(and(eq(sosProfilesTable.userId, vehicle.userId), eq(sosProfilesTable.isEnabled, true)));

    if (!profile) {
      res.status(404).json({ error: "SOS profile not enabled" });
      return;
    }

    res.json({
      emergencyContactName: profile.emergencyContactName,
      emergencyPhone: profile.emergencyPhone,
      bloodGroup: profile.bloodGroup,
      medicalNotes: profile.medicalNotes,
      altContactName: profile.altContactName,
      altContactPhone: profile.altContactPhone,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch public SOS");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/alert
router.post("/public/vehicle/:qrCode/alert", async (req, res) => {
  const { qrCode } = req.params;
  const { alertType, message, scannerLocation } = req.body;

  if (!alertType) {
    res.status(400).json({ error: "alertType is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, vehicle.userId));

    if (user && user.plan === "free" && user.alertsThisMonth >= 5) {
      res.status(429).json({ error: "Monthly alert limit reached for this vehicle's owner" });
      return;
    }

    const [alert] = await db
      .insert(scanAlertsTable)
      .values({ vehicleId: vehicle.id, alertType, message: message || null, scannerLocation: scannerLocation || null, isRead: false })
      .returning();

    if (user) {
      await db
        .update(usersTable)
        .set({ alertsThisMonth: sql`${usersTable.alertsThisMonth} + 1` })
        .where(eq(usersTable.userId, vehicle.userId));
    }

    res.status(201).json({ ...alert, vehicleNumber: vehicle.vehicleNumber });
  } catch (err) {
    req.log.error(err, "Failed to send public alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/accident
router.post("/public/vehicle/:qrCode/accident", async (req, res) => {
  const { qrCode } = req.params;
  const { description, photos = [], latitude, longitude, locationLabel } = req.body;

  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    // Validate photos: each must be a real JPEG/PNG/WEBP/GIF data URL within size limits
    const photoCheck = validatePhotoArray(photos, 3);
    if (!photoCheck.ok) {
      res.status(400).json({ error: photoCheck.error });
      return;
    }

    const [report] = await db
      .insert(accidentReportsTable)
      .values({
        vehicleId: vehicle.id,
        description,
        photos: photoCheck.photos,
        latitude: latitude || null,
        longitude: longitude || null,
        locationLabel: locationLabel || null,
        isRead: false,
      })
      .returning();

    res.status(201).json({
      ...report,
      photos: (report.photos as string[]) || [],
      vehicleNumber: vehicle.vehicleNumber,
      reportedAt: report.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to submit accident report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/public/vehicle/:qrCode/lost-item
router.post("/public/vehicle/:qrCode/lost-item", async (req, res) => {
  const { qrCode } = req.params;
  const { message, photos = [], latitude, longitude, locationLabel, finderContact } = req.body;

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const vehicle = await resolveVehicle(qrCode);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found or QR is disabled" });
      return;
    }

    // Lost item submissions allow up to 2 photos (matches the frontend cap).
    const photoCheck = validatePhotoArray(photos, 2);
    if (!photoCheck.ok) {
      res.status(400).json({ error: photoCheck.error });
      return;
    }

    const [item] = await db
      .insert(lostItemsTable)
      .values({
        vehicleId: vehicle.id,
        message,
        photos: photoCheck.photos,
        latitude: latitude || null,
        longitude: longitude || null,
        locationLabel: locationLabel || null,
        finderContact: finderContact || null,
        isRead: false,
      })
      .returning();

    res.status(201).json({
      ...item,
      photos: (item.photos as string[]) || [],
      vehicleNumber: vehicle.vehicleNumber,
      reportedAt: item.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to submit lost item report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
