import { Client } from "@gradio/client";

const SPACE_ID = "prithivMLmods/Qwen-Image-Edit-2511-LoRAs-Fast";
const APP_CODE = "8700";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-App-Code");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Check access code
  const providedCode = req.headers["x-app-code"] || req.body?.code;
  if (providedCode !== APP_CODE) {
    return res.status(401).json({
      error: "Invalid access code. Provide code '8700' via X-App-Code header or in body.code"
    });
  }

  try {
    const { image, prompt, lora, seed } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing 'image' field (base64 data URL)" });
    }
    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' field" });
    }

    const selectedLora = lora || "Photo-to-Anime";
    const useSeed = seed || Math.floor(Math.random() * 1000000);

    console.log(`[REQUEST] Prompt: "${prompt}" | LoRA: ${selectedLora}`);

    // Connect to Hugging Face
    const client = await Client.connect(SPACE_ID);

    const imagesJson = JSON.stringify([image]);

    // Call Gradio prediction
    const result = await client.predict("/edit_image", {
      images_b64_json: imagesJson,
      prompt: prompt,
      lora_adapter: selectedLora,
      seed: useSeed,
      randomize_seed: true,
      guidance_scale: 1.0,
      steps: 4,
    });

    // Result comes as { data: [...] }
    const output = result.data?.[0];

    if (!output || typeof output !== "object") {
      console.error("Unexpected response:", result);
      return res.status(500).json({
        error: "Unexpected response from AI",
        details: result
      });
    }

    const editedImage = output.image;
    if (!editedImage) {
      return res.status(500).json({
        error: "No image returned from AI",
        details: output
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      image: editedImage,
      seed: output.seed || useSeed,
      lora: selectedLora,
      prompt: prompt
    });

  } catch (error) {
    console.error("[ERROR]", error);
    return res.status(500).json({
      error: "AI processing failed",
      message: error.message || String(error),
      stack: error.stack
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb"
    }
  }
};
