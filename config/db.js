const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load .env variables (Built-in Node support + pure fallback)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === "function") {
        try {
            process.loadEnvFile(envPath);
        } catch (e) {
            // fallback
        }
    }
    try {
        const envContent = fs.readFileSync(envPath, "utf-8");
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx !== -1) {
                    const key = trimmed.substring(0, eqIdx).trim();
                    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error reading .env:", err.message);
    }
}

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledgerDB";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "ledgerDB";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB Connected Successfully");

        // Ensure all existing documents have isActive boolean set
        try {
            await mongoose.connection.collection(COLLECTION_NAME).updateMany(
                { $or: [{ isActive: { $exists: false } }, { isActive: null }] },
                { $set: { isActive: true } }
            );
            await mongoose.connection.collection(COLLECTION_NAME).updateMany(
                { Inactive: { $exists: true } },
                { $unset: { Inactive: "" } }
            );
        } catch (e) {
            // ignore
        }
    } catch (err) {
        console.error("MongoDB Error:", err.message);
        process.exit(1);
    }
};

const getCollection = () => mongoose.connection.collection(COLLECTION_NAME);

module.exports = { connectDB, getCollection };
