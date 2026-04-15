import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useState } from 'react';

export default function ImageSetupNode({ id, data, isConnectable }: any) {
  const { prompt = "", imageUrl = null, isGenerating = false, onUpdate } = data;
  const { getEdges, getNodes } = useReactFlow();

  const handlePromptChange = (e: any) => {
    if (onUpdate) onUpdate(id, { prompt: e.target.value });
  };

  const handleGenerate = () => {
    // 1. Look for incoming connections on 'ref_in' (Character DNA)
    const edges = getEdges();
    const incomingRefEdge = edges.find((e) => e.target === id && e.targetHandle === 'ref_in');
    let refImageUrl = null;
    
    if (incomingRefEdge) {
      const parentNode = getNodes().find(n => n.id === incomingRefEdge.source);
      if (parentNode && parentNode.data && parentNode.data.characterUrl) {
        refImageUrl = parentNode.data.characterUrl;
      }
    }

    // Pass everything up to the orchestrator in page.tsx
    if (data.onGenerateImage) {
      data.onGenerateImage(id, prompt, refImageUrl);
    }
  };

  return (
    <div className="card" style={{ width: 280, padding: 12, border: '1px solid var(--green)' }}>
      {/* Input for DNA / Control */}
      <Handle type="target" position={Position.Left} id="ref_in" isConnectable={isConnectable} style={{ top: 20 }} />
      
      <p className="font-semibold text-xs mb-sm" style={{ color: 'var(--green)' }}>Image Generation</p>
      
      <textarea
        className="textarea w-full text-xs"
        style={{ minHeight: 60, marginBottom: 8 }}
        placeholder="A cinematic shot of a young heroine..."
        value={prompt}
        onChange={handlePromptChange}
      />
      
      <div style={{ marginBottom: 12 }}>
         {imageUrl ? (
           <img src={imageUrl} alt="Generated" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 }} />
         ) : (
           <div style={{ width: '100%', height: 120, background: 'var(--bg-secondary)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--tertiary)' }}>
             Без изображения
           </div>
         )}
      </div>

      <button className="btn w-full" style={{ fontSize: 11, padding: "4px 8px", background: 'var(--green)', color: '#fff' }} onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Генерация..." : "Создать Кадр"}
      </button>

      {/* Output for next stages (Video) */}
      <Handle type="source" position={Position.Right} id="image_out" isConnectable={isConnectable} />
    </div>
  );
}
