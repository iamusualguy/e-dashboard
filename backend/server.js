import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import sharp from "sharp";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from webapp dist
app.use(express.static(path.join(__dirname, "../webapp/dist")));

console.log(
  `[${new Date().toISOString()}] NS_API_KEY present=${!!process.env.NS_API_KEY}`,
);

// Persistent browser instance
let browser = null;
let page = null;
let isGeneratingScreenshot = false;

// Initialize persistent browser
async function initBrowser() {
  try {
    console.log(`[${new Date().toISOString()}] Initializing browser...`);
    browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      timeout: 30000,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-setuid-sandbox",
        "--no-zygote",
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 1076, height: 839 },
    });
    page = await context.newPage();
    console.log(
      `[${new Date().toISOString()}] Browser initialized successfully`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Failed to initialize browser: ${error.message}`,
    );
    browser = null;
    page = null;
  }
}

// Close persistent browser
async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
      console.log(`[${new Date().toISOString()}] Browser closed`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error closing browser: ${error.message}`,
      );
    }
    browser = null;
    page = null;
  }
}

// Screenshot generation function using persistent browser
async function generateDashboardScreenshot() {
  if (isGeneratingScreenshot) {
    console.log(
      `[${new Date().toISOString()}] Screenshot generation already in progress, skipping`,
    );
    return;
  }

  isGeneratingScreenshot = true;
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/?from=KZ,ZD&to=ASA`;
  const outputPath = path.join(__dirname, "dashboard.png");

  try {
    // Initialize browser if not already running
    if (!browser || !page) {
      await initBrowser();
      if (!browser || !page) {
        throw new Error("Failed to initialize browser");
      }
    }

    console.log(
      `[${new Date().toISOString()}] Generating screenshot from ${url}`,
    );

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    
    // Rotate 90 degrees clockwise
    await sharp(screenshotBuffer)
      .rotate(90)
      .toFile(outputPath);
    
    console.log(
      `[${new Date().toISOString()}] Screenshot saved to ${outputPath} (rotated 90°)`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Screenshot generation failed: ${error.message}`,
    );
    // Close and reset browser on error to try fresh next time
    await closeBrowser();
  } finally {
    isGeneratingScreenshot = false;
  }
}

// Generate screenshot every 5 minutes
const SCREENSHOT_INTERVAL = 1 * 60 * 1000;

app.get("/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() }),
);

app.post("/generate-screenshot", async (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Manual screenshot generation requested`,
  );
  try {
    await generateDashboardScreenshot();
    res.json({
      ok: true,
      message: "Screenshot generated successfully",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Manual screenshot generation failed: ${error.message}`,
    );
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/dashboard.png", (req, res) => {
  const imagePath = path.join(__dirname, "dashboard.png");
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.log(
        `[${new Date().toISOString()}] /dashboard.png error: ${err.message}`,
      );
      res.status(404).send("Image not found");
    }
  });
});

app.get("/trips", async (req, res) => {
  const fromStation = req.query.fromStation;
  const toStation = req.query.toStation;
  const dateTime = req.query.dateTime;
  const apiKey = process.env.NS_API_KEY || "";

  if (!apiKey) {
    console.log(`[${new Date().toISOString()}] /trips missing NS_API_KEY`);
    return res.json({ trips: [], source: "no-key" });
  }

  if (!fromStation || !toStation) {
    return res
      .status(400)
      .json({ error: "fromStation and toStation are required" });
  }

  try {
    const params = new URLSearchParams();
    params.append("fromStation", fromStation);
    params.append("toStation", toStation);
    if (dateTime) params.append("dateTime", dateTime);

    const url = `https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips?${params.toString()}`;
    console.log(`[${new Date().toISOString()}] /trips requesting ${url}`);

    const apiRes = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!apiRes.ok) {
      const errorBody = await apiRes.text();
      console.log(
        `[${new Date().toISOString()}] /trips error status=${apiRes.status} body=${errorBody.slice(0, 200)}`,
      );
      return res.status(apiRes.status).json({
        error: `NS API error ${apiRes.status}`,
        body: errorBody.slice(0, 500),
      });
    }

    const json = await apiRes.json();
    // console.log(json.trips[0].legs[0]);
    const trips = (json.trips || []).map((trip) => ({
      uid: trip.uid,
      plannedDurationInMinutes: trip.plannedDurationInMinutes,
      actualDurationInMinutes: trip.actualDurationInMinutes,
      transfers: trip.transfers,
      status: trip.status,
      legs: (trip.legs || []).map((leg) => ({
        origin: leg.origin?.name,
        direction: leg.direction,
        destination: leg.destination?.name,
        product: leg.product?.displayName || leg.product?.categoryCode,
        plannedDeparture: leg.origin?.plannedDateTime,
        actualDeparture: leg.origin?.actualDateTime,
        plannedArrival: leg.destination?.plannedDateTime,
        actualArrival: leg.destination?.actualDateTime,
        departureTrack: leg.origin?.actualTrack || leg.origin?.plannedTrack,
        arrivalTrack:
          leg.destination?.actualTrack || leg.destination?.plannedTrack,
        cancelled: leg.cancelled,
        departurePlatformChanged:
          leg.origin?.plannedTrack &&
          leg.origin?.actualTrack &&
          leg.origin?.plannedTrack !== leg.origin?.actualTrack,
        arrivalPlatformChanged:
          leg.destination?.plannedTrack &&
          leg.destination?.actualTrack &&
          leg.destination?.plannedTrack !== leg.destination?.actualTrack,
      })),
    }));

    console.log(
      `[${new Date().toISOString()}] /trips returned ${trips.length} trips`,
    );
    res.json({ trips, source: "live" });
  } catch (e) {
    console.log(`[${new Date().toISOString()}] /trips error err=${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Catch-all route to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../webapp/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
  console.log(`[${new Date().toISOString()}] Startup complete`);

  // Initialize browser once
  initBrowser().then(() => {
    console.log(`[${new Date().toISOString()}] Browser initialization complete`);
  }).catch((err) => {
    console.error(`[${new Date().toISOString()}] Browser initialization failed: ${err.message}`);
  });

  // Start screenshot generation after server is ready
  setInterval(generateDashboardScreenshot, SCREENSHOT_INTERVAL);

  // Generate initial screenshot after giving browser time to initialize
  setTimeout(() => {
    generateDashboardScreenshot().catch((err) => {
      console.error(
        `[${new Date().toISOString()}] Initial screenshot failed: ${err.message}`,
      );
    });
  }, 10000);
});

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log(
    `[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`,
  );
  await closeBrowser();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log(
    `[${new Date().toISOString()}] SIGINT received, shutting down gracefully`,
  );
  await closeBrowser();
  process.exit(0);
});
