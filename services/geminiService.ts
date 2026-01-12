import { GoogleGenAI, Part } from "@google/genai";
import { AspectRatio } from "../types";

// Models
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const UPSCALE_MODEL = 'gemini-3-pro-image-preview';

/**
 * Helper to check and request API Key selection if needed (Required for Pro models)
 */
export const requestApiKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
    } else {
        console.warn("API Key selection is not supported in this environment.");
    }
}

/**
 * Generates an image based on a prompt and an optional reference image.
 * Uses Gemini 2.5 Flash Image.
 */
export const generateFlowImage = async (
  prompt: string,
  referenceImageBase64: string | null,
  aspectRatio: AspectRatio
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: Part[] = [];
    
    // If there is a previous image, use it as input context (visual prompt)
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: referenceImageBase64,
        },
      });
      // Add a guiding instruction to ensure continuity
      parts.push({ 
        text: "Using the provided image as a strict structural and compositional reference, generate a new image that transforms the scene according to this instruction: " 
      });
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio
        }
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }
    
    throw new Error("No image data found in response");

  } catch (error: any) {
    console.error("Image generation error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};

/**
 * Upscales an image to 2K resolution using Gemini 3 Pro.
 * Requires Paid API Key selection.
 */
export const upscaleFlowImage = async (
    prompt: string,
    imageBase64: string,
    aspectRatio: AspectRatio
): Promise<string> => {
    try {
        // Check for API Key selection for Pro model
        // @ts-ignore
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
            // @ts-ignore
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                 throw new Error("API_KEY_REQUIRED");
            }
        }
    
        // Create a NEW instance to pick up the selected key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const parts: Part[] = [
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64,
                },
            },
            { 
                text: `Generate a high-fidelity, 2K resolution version of this image. Maintain the exact composition, lighting, and details of the reference image while significantly improving sharpness and texture quality. ${prompt}` 
            }
        ];
    
        const response = await ai.models.generateContent({
            model: UPSCALE_MODEL,
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: '2K'
                }
            }
        });
    
        // Extract image from response
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }
        
        throw new Error("No upscaled image data found");
    
    } catch (error: any) {
        // Don't log API_KEY_REQUIRED as it's an expected flow control error
        if (error.message !== "API_KEY_REQUIRED") {
            console.error("Upscale error:", error);
        }
        
        if (error.message && error.message.includes("Requested entity was not found")) {
            throw new Error("API_KEY_INVALID");
        }
        throw error;
    }
};