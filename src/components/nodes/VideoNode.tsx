import { Handle, Position, useReactFlow } from '@xyflow/react';

export default function VideoNode({ id, data, isConnectable }: any) {
  const { prompt = "", duration = 5, videoUrl = null, isGenerating = false, onUpdate } = data;
  const { getEdges, getNodes } = useReactFlow();

  const handlePromptChange = (e: any) => {
    if (onUpdate) onUpdate(id, { prompt: e.target.value });
  };

  const handleDurationChange = (e: any) => {
    if (onUpdate) onUpdate(id, { duration: Number(e.target.value) });
  };

  const handleGenerate = () => {
    // Look for incoming connections on 'image_in'
    const edges = getEdges();
    const incomingEdge = edges.find((e) => e.target === id && e.targetHandle === 'image_in');
    let startFrameUrl = null;
    
    if (incomingEdge) {
      const parentNode = getNodes().find(n => n.id === incomingEdge.source);
      if (parentNode && parentNode.data && parentNode.data.imageUrl) {
        startFrameUrl = parentNode.data.imageUrl;
      }
    }

    if (!startFrameUrl) {
      alert("Сначала соедините эту ноду с готовым кадром (ImageNode)!");
      return;
    }

    // Call orchestrator
    if (data.onGenerateVideo) {
      data.onGenerateVideo(id, prompt, duration, startFrameUrl);
    }
  };

  return (
    <div className="card" style={{ width: 320, padding: 12, border: '1px solid var(--border-primary)', background: '#111', color: '#fff' }}>
      <Handle type="target" position={Position.Left} id="image_in" isConnectable={isConnectable} style={{ top: 20 }} />
      
      <p className="font-semibold text-xs mb-sm">Video Motion</p>
      
      <textarea
        className="textarea w-full text-xs"
        style={{ minHeight: 60, marginBottom: 8, background: '#222', color: '#fff', border: '1px solid #333' }}
        placeholder="A cinematic shot transitioning..."
        value={prompt}
        onChange={handlePromptChange}
      />
      
      <div className="flex gap-xs items-center mb-sm">
        <label className="text-xs" style={{ color: '#aaa' }}>Duration (s):</label>
        <input 
          type="number" 
          value={duration} 
          onChange={handleDurationChange} 
          style={{ width: 50, background: '#222', border: '1px solid #333', color: '#fff', padding: '2px 4px', borderRadius: 4, fontSize: 11 }} 
        />
      </div>

      {videoUrl ? (
        <video src={videoUrl} controls style={{ width: '100%', borderRadius: 4, marginBottom: 8 }} />
      ) : (
        <div style={{ height: 140, background: '#222', borderRadius: 4, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#666' }}>
          {isGenerating ? "Рендеринг видео..." : "Ожидает генерации"}
        </div>
      )}

      <button className="btn btn-primary w-full" style={{ fontSize: 11, padding: "4px 8px" }} onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Генерация..." : "Создать Видео"}
      </button>

      {/* Output for Timeline compilation */}
      <Handle type="source" position={Position.Right} id="video_out" isConnectable={isConnectable} />
    </div>
  );
}
