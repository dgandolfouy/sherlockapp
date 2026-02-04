
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyALO4JJL4Rtl0epiobdqh2wk_uslhRmhgM";

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Try listing models via the API if the SDK supports it, or try to instantiate a few common ones
        // The SDK actually exposes a check via the model itself? No.
        // We can't easily list models with this SDK version directly in a simple way without looking up the docs for listModels.
        // Wait, the GoogleGenerativeAI class doesn't have listModels?
        // Let's try to just Instantiate and run a dummy prompt on a few candidates.

        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash"
        ];

        console.log("Testing model availability...");

        for (const modelName of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                // Just generate 1 token to test existence
                await model.generateContent("Hello");
                console.log(`[SUCCESS] ${modelName} is AVAILABLE`);
            } catch (error) {
                console.log(`[FAILED] ${modelName}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
