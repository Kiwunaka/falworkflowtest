import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { useSettings } from '@/lib/settings';
import { fal, createFalWithKey } from '@/lib/fal';

export default function CharacterNode({ id, data, isConnectable }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const { settings } = useSettings();
  const activeFal = settings.falKey ? createFalWithKey(settings.falKey) : fal;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await activeFal.storage.upload(file);
      // Update the node's local data
      if (data.onUpdate) {
        data.onUpdate(id, { characterUrl: url });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card" style={{ width: 280, padding: 12, border: '2px solid #eab308', background: '#fefce8' }}>
      <p className="font-semibold text-xs mb-sm" style={{ color: '#ca8a04' }}>DNA: Character Reference</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.characterUrl ? (
           <img src={data.characterUrl} alt="Character DNA" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6 }} />
        ) : (
           <div style={{ width: '100%', height: 160, background: '#fef08a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207', fontSize: 12 }}>
             No Image Set
           </div>
        )}
        
        <label className="btn btn-secondary w-full" style={{ fontSize: 11, padding: "6px 8px", cursor: 'pointer', textAlign: 'center' }}>
          {isUploading ? "Загрузка в облако..." : "Загрузить фото лица"}
          <input type="file" accept="image/*" hidden onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* Output port for the Image Ref */}
      <Handle type="source" position={Position.Right} id="image_ref" isConnectable={isConnectable} style={{ background: '#eab308' }} />
    </div>
  );
}
