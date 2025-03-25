const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");
const { shopifyApi, LATEST_API_VERSION } = require("@shopify/shopify-api");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "your_secret_key", // Change this to a strong random value
    resave: false,
    saveUninitialized: true,
  })
);

// Shopify API Configuration
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","),
  hostName: process.env.SHOPIFY_APP_URL.replace("https://", ""),
  apiVersion: LATEST_API_VERSION,
});

// Step 1: Install App (OAuth)
app.get("/", async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Shop parameter is missing");

  const authUrl = await shopify.auth.begin({
    shop,
    redirectUri: process.env.SHOPIFY_REDIRECT_URI,
  });

  res.redirect(authUrl);
});

// Step 2: Handle Shopify Callback
app.get("/auth/callback", async (req, res) => {
  try {
    const session = await shopify.auth.validateAuthCallback(req, res, req.query);
    req.session.shop = session.shop;
    req.session.accessToken = session.accessToken;
    res.send("App installed successfully!");
  } catch (error) {
    console.error("Auth Callback Error:", error);
    res.status(500).send("Authentication failed!");
  }
});

// Step 3: Fetch Orders from Shopify
app.get("/orders", async (req, res) => {
  try {
    const shop = req.session.shop;
    const accessToken = req.session.accessToken;

    if (!shop || !accessToken) {
      return res.status(401).send("Unauthorized");
    }

    const client = new shopify.clients.Rest({
      session: { shop, accessToken },
    });

    const response = await client.get({ path: "orders" });
    res.json(response.body);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders");
  }
});

// Start the Express Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
