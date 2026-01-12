import React from 'react';
import { FlowStep, FlowStatus } from '../types';

interface StepCardProps {
  step: FlowStep;
  index: number;
  totalSteps: number;
  onUpdatePrompt: (id: string, newPrompt: string) => void;
  onDelete: (id: string) => void;
  onEnterPress: () => void;
  onUpscale: (id: string) => void;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  totalSteps,
  onUpdatePrompt,
  onDelete,
  onEnterPress,
  onUpscale
}) => {
  const isGenerating = step.status === FlowStatus.GENERATING;
  const isUpscaling = step.status === FlowStatus.UPSCALING;
  const hasImage = !!step.imageBase64;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnterPress();
    }
  };

  return (
    <div className="flex flex-col relative">
      {/* Connector Line */}
      {index < totalSteps - 1 && (
        <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-700 -z-10 h-[calc(100%+2rem)]" />
      )}

      <div className="flex gap-4 items-start p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors shadow-sm">
        {/* Number Badge */}
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
          hasImage ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}>
          {index + 1}
        </div>

        {/* Content Area */}
        <div className="flex-grow space-y-4">
          
          {/* Inputs */}
          <div className="flex justify-between items-start gap-2">
            <div className="w-full">
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
                {index === 0 ? "Starting Scene" : `Evolution Step ${index}`}
              </label>
              <textarea
                value={step.prompt}
                onChange={(e) => onUpdatePrompt(step.id, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={index === 0 ? "Describe the initial scene (e.g., An empty concrete room)" : "Describe how the scene changes (e.g., Add a modern sofa and a rug)"}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none h-20"
                disabled={isGenerating || isUpscaling}
              />
              <div className="text-[10px] text-gray-600 mt-1 text-right">Press Enter to generate</div>
            </div>
            
            {/* Delete Button */}
            <button 
              onClick={() => onDelete(step.id)}
              disabled={isGenerating || isUpscaling}
              className="text-gray-600 hover:text-red-500 p-1 transition-colors disabled:opacity-50"
              title="Remove Step"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Outputs Area */}
          {(hasImage || isGenerating || isUpscaling || step.error) && (
            <div className="mt-4">
              
              {/* Image Output */}
              <div className="relative w-full max-w-2xl bg-gray-950 rounded-lg border border-gray-800 overflow-hidden flex items-center justify-center group">
                
                {/* 2K Badge */}
                {step.isUpscaled && !isUpscaling && (
                   <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10">
                     2K
                   </div>
                )}

                {step.status === FlowStatus.GENERATING ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-blue-400 animate-pulse">
                    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Generating Image...</span>
                  </div>
                ) : hasImage ? (
                  <>
                    <img 
                      src={`data:image/png;base64,${step.imageBase64}`} 
                      alt={`Generated step ${index}`} 
                      className={`w-full h-auto object-contain max-h-[500px] transition-opacity ${isUpscaling ? 'opacity-50' : 'opacity-100'}`}
                    />
                    
                    {/* Upscaling Overlay */}
                    {isUpscaling && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <svg className="animate-spin h-8 w-8 text-purple-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs font-semibold text-purple-400 shadow-black drop-shadow-md">Upscaling to 2K...</span>
                        </div>
                    )}

                    {/* Action Overlay */}
                    {!isUpscaling && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a 
                                href={`data:image/png;base64,${step.imageBase64}`} 
                                download={`flow-step-${index}-${step.isUpscaled ? '2k' : '1k'}.png`}
                                className="bg-white/10 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs hover:bg-white/20 flex items-center gap-1.5 border border-white/10"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                                </svg>
                                Download
                            </a>

                            {!step.isUpscaled && (
                                <button
                                    onClick={() => onUpscale(step.id)}
                                    className="bg-purple-600/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-600 flex items-center gap-1.5 border border-purple-400/30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v1.883l.643-.643a.75.75 0 0 1 1.06 1.061l-1.928 1.929a.75.75 0 0 1-1.06 0L7.543 4.05a.75.75 0 0 1 1.061-1.06l.646.645V1.75A.75.75 0 0 1 10 1ZM2.75 8a.75.75 0 0 1 .75-.75h14a.75.75 0 0 1 0 1.5h-14A.75.75 0 0 1 2.75 8Z" clipRule="evenodd" />
                                        <path d="M3 11a1 1 0 1 0 0 2h15a1 1 0 1 0 0-2H3Z" />
                                        <path d="M4 16a1 1 0 1 0 0 2h13a1 1 0 1 0 0-2H4Z" />
                                    </svg>
                                    Upscale 2K
                                </button>
                            )}
                        </div>
                    )}
                  </>
                ) : step.error ? (
                  <div className="p-8 text-center text-red-400 text-sm">
                    Error: {step.error}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};