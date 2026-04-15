import { Handle, Position } from '@xyflow/react';

export default function SceneNode({ data, isConnectable }: any) {
  const { scene, startFrame, endFrame, onGenerate, isGenerating, sceneIndex } = data;

  return (
    <div className="card" style={{ width: 280, padding: 12, border: '1px solid var(--border-primary)' }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      
      <div className="flex justify-between items-center mb-xs">
        <span className="font-semibold text-xs">Scene {scene.sceneNumber}</span>
        <span className="tag tag-green text-[10px]">{scene.duration}s</span>
      </div>
      <p className="text-[10px] text-tertiary mb-sm" style={{ maxHeight: 40, overflow: "hidden" }}>{scene.title}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
           <span className="text-[10px] text-green-500 font-medium">Start</span>
           {startFrame ? <img src={startFrame} alt="start" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ height: 60, background: 'var(--bg-secondary)', borderRadius: 4 }} />}
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
           <span className="text-[10px] text-red-500 font-medium">End</span>
           {endFrame ? <img src={endFrame} alt="end" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ height: 60, background: 'var(--bg-secondary)', borderRadius: 4 }} />}
         </div>
      </div>

      <button className="btn btn-secondary w-full" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onGenerate(sceneIndex)} disabled={isGenerating}>
        {isGenerating ? "Генерация..." : "Generate Specific Scene Images"}
      </button>

      <Handle type="source" position={Position.Right} id="video-out" isConnectable={isConnectable} />
    </div>
  );
}
