import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StepCard } from './components/StepCard';
import { FlowStep, FlowStatus, AspectRatio } from './types';
import { generateFlowImage, upscaleFlowImage, requestApiKeySelection } from './services/geminiService';

const App: React.FC = () => {
  const [steps, setSteps] = useState<FlowStep[]>([
    { id: uuidv4(), prompt: '', status: FlowStatus.IDLE, imageBase64: null }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  // --- Actions ---

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { id: uuidv4(), prompt: '', status: FlowStatus.IDLE, imageBase64: null }
    ]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return; // Prevent deleting the last remaining step
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const updatePrompt = (id: string, newPrompt: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, prompt: newPrompt } : s));
  };

  // --- Generation Logic ---

  const generateImages = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    let previousImage: string | null = null;
    
    // Create a deep copy to work with during the async loop
    let currentSteps = [...steps];

    try {
      for (let i = 0; i < currentSteps.length; i++) {
        const step = currentSteps[i];
        
        // Skip if empty prompt
        if (!step.prompt.trim()) {
            if (step.imageBase64) previousImage = step.imageBase64; // Keep continuity if skipping empty
            continue;
        }

        // Don't regenerate if already done (unless we implement a "Force Regenerate" later)
        if (step.imageBase64 && step.status === FlowStatus.COMPLETED) {
            previousImage = step.imageBase64;
            continue;
        }

        // Update status to generating
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: FlowStatus.GENERATING, error: undefined } : s));

        try {
          const generatedImageBase64: string = await generateFlowImage(step.prompt, previousImage, aspectRatio);
          
          // Update step with result
          setSteps(prev => prev.map((s, idx) => idx === i ? { 
            ...s, 
            status: FlowStatus.COMPLETED, 
            imageBase64: generatedImageBase64,
            isUpscaled: false
          } : s));

          // Set context for next iteration
          previousImage = generatedImageBase64;

        } catch (err: any) {
          console.error(`Error generating step ${i + 1}:`, err);
          setSteps(prev => prev.map((s, idx) => idx === i ? { 
            ...s, 
            status: FlowStatus.ERROR, 
            error: err.message 
          } : s));
          // Break flow on error to maintain continuity integrity
          break; 
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [steps, isProcessing, aspectRatio]);

  const handleUpscale = async (id: string) => {
    const step = steps.find(s => s.id === id);
    if (!step || !step.imageBase64 || step.status === FlowStatus.UPSCALING) return;

    setSteps(prev => prev.map(s => s.id === id ? { ...s, status: FlowStatus.UPSCALING } : s));

    try {
        const upscaledImage = await upscaleFlowImage(step.prompt, step.imageBase64, aspectRatio);
        
        setSteps(prev => prev.map(s => s.id === id ? {
            ...s,
            status: FlowStatus.COMPLETED,
            imageBase64: upscaledImage,
            isUpscaled: true
        } : s));

    } catch (e: any) {
        if (e.message === "API_KEY_REQUIRED" || e.message === "API_KEY_INVALID") {
             await requestApiKeySelection();
             // Reset status so user can try again
             setSteps(prev => prev.map(s => s.id === id ? { ...s, status: FlowStatus.COMPLETED } : s));
        } else {
            console.error("Upscale failed", e);
            setSteps(prev => prev.map(s => s.id === id ? { 
                ...s, 
                status: FlowStatus.COMPLETED, // Revert to completed (but show error in next line maybe?)
                error: "Upscale failed. Please try again." 
            } : s));
        }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
              F
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              FlowGen AI
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            
            {/* Aspect Ratio Selector */}
            <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${aspectRatio === '16:9' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    16:9
                </button>
                <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${aspectRatio === '9:16' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    9:16
                </button>
            </div>

            <button
              onClick={generateImages}
              disabled={isProcessing}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                isProcessing 
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Flow
                </>
              ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                    </svg>
                    Generate Images
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="mb-8 text-center space-y-2">
            <h2 className="text-3xl font-light tracking-tight text-white">Create your visual story</h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
                Define a sequence of prompts. Each step uses the previous image as a reference to ensure consistency.
            </p>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              totalSteps={steps.length}
              onUpdatePrompt={updatePrompt}
              onDelete={removeStep}
              onEnterPress={generateImages}
              onUpscale={handleUpscale}
            />
          ))}
        </div>

        {/* Add Step Button */}
        <div className="mt-8 flex justify-center">
            <button
                onClick={addStep}
                disabled={isProcessing}
                className="group flex flex-col items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors"
            >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 group-hover:border-blue-500 flex items-center justify-center transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </div>
                <span className="text-sm font-medium">Add Next Scene</span>
            </button>
        </div>
      </main>

    </div>
  );
};

export default App;