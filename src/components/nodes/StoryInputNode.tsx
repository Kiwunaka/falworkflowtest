import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
const STYLES = [
  { value: "Pixar-style 3D animation, soft diffused lighting, warm palette", label: "Pixar / 3D Анимация" },
  { value: "Realistic cinematic photography, shallow depth of field, natural lighting", label: "Реалистичное кино" },
  { value: "Studio Ghibli anime style, watercolor textures, soft pastel tones", label: "Аниме (Ghibli)" },
  { value: "Watercolor illustration, loose brushstrokes, soft edges, muted tones", label: "Акварель" },
  { value: "Dark cinematic noir, high contrast, chiaroscuro lighting, desaturated", label: "Нуар" },
  { value: "Vibrant cartoon animation, bold outlines, saturated colors, exaggerated proportions", label: "Мультфильм" },
];

export default function StoryInputNode({ data, isConnectable }: any) {
  const [idea, setIdea] = useState(data.idea || "");
  const [style, setStyle] = useState(data.style || STYLES[0].value);
  const [sceneCount, setSceneCount] = useState(data.sceneCount || 4);

  return (
    <div className="card" style={{ width: 320, padding: 16 }}>
      <p className="font-semibold text-sm mb-lg">Story Planner</p>
      
      <div className="flex flex-col gap-sm">
        <textarea
          className="textarea"
          placeholder="Idea..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <select className="select" value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
           <input type="number" min={2} max={8} className="input" style={{ width: 60 }} value={sceneCount} onChange={e => setSceneCount(Number(e.target.value))} />
           <button 
             className="btn btn-primary" 
             style={{ flex: 1 }}
             onClick={() => data.onGenerate(idea, style, sceneCount)}
             disabled={data.isLoading}
           >
             {data.isLoading ? "Обдумывает..." : "Сгенерировать Сцены"}
           </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="a"
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
}
