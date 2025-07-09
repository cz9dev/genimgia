const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../ai-config.json");

let config = {
  apiKey: process.env.AI_API_KEY || "",
  baseURL: process.env.AI_BASE_URL || "https://apigateway.avangenio.net",
  model: process.env.AI_MODEL || "image-sm",
  size: process.env.AI_IMAGE_SIZE || "1024x1024",
  quality: process.env.AI_IMAGE_QUALITY || "standard",
};

// Cargar configuración desde archivo si existe
if (fs.existsSync(configPath)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config = { ...config, ...savedConfig };
  } catch (err) {
    console.error("Error loading AI config:", err);
  }
}

module.exports = {
  getConfig: () => config,
  updateConfig: (newConfig) => {
    config = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return config;
  },
};
