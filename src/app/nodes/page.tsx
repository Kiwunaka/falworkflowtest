"use client";
import { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import StoryInputNode from '@/components/nodes/StoryInputNode';
import ImageSetupNode from '@/components/nodes/ImageSetupNode';
import VideoNode from '@/components/nodes/VideoNode';
import CharacterNode from '@/components/nodes/CharacterNode';

import { useSettings, buildApiHeaders } from '@/lib/settings';
import { fal, createFalWithKey } from '@/lib/fal';

const nodeTypes = {
  storyInput: StoryInputNode,
  imageSetup: ImageSetupNode,
  videoNode: VideoNode,
  characterDNA: CharacterNode,
};

const initialNodes: Node[] = [
  {
    id: 'story-planner',
    type: 'storyInput',
    position: { x: 50, y: 300 },
    data: { idea: "", style: "hyper-realistic", sceneCount: 4 },
  },
];

export default function NodeEditorPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const { settings } = useSettings();
  const apiHeaders = useMemo(() => buildApiHeaders(settings), [settings]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const activeFal = settings.falKey ? createFalWithKey(settings.falKey) : fal;

  const onUpdateNodeData = (nodeId: string, updates: Record<string, any>) => {
    setNodes((nds) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n));
  };

  const onGenerateImage = async (nodeId: string, prompt: string, refImageUrl: string | null) => {
    onUpdateNodeData(nodeId, { isGenerating: true });
    try {
      const input: any = { prompt, image_size: "landscape_16_9" };
      if (refImageUrl) input.image_url = refImageUrl;
      
      const result = await activeFal.subscribe("fal-ai/flux/schnell", { input });
      const images = (result.data as any).images || [];
      const imageUrl = images[0]?.url || (result.data as any).image?.url;
      onUpdateNodeData(nodeId, { imageUrl, isGenerating: false });
    } catch (err) {
      console.error(err);
      onUpdateNodeData(nodeId, { isGenerating: false });
    }
  };

  const onGenerateVideo = async (nodeId: string, prompt: string, duration: number, startFrameUrl: string) => {
    onUpdateNodeData(nodeId, { isGenerating: true });
    try {
      // Defaulting to Veo 3.1 or Kling for standard fallback
      const input = { 
        prompt, 
        image_url: startFrameUrl, 
        duration: String(duration) 
      };
      
      const result = await activeFal.subscribe("fal-ai/luma-dream-machine", { input });
      const video = (result.data as any).video?.url;
      onUpdateNodeData(nodeId, { videoUrl: video, isGenerating: false });
    } catch (err) {
      console.error(err);
      onUpdateNodeData(nodeId, { isGenerating: false });
    }
  };

  // Add Free Nodes
  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        onUpdate: onUpdateNodeData,
        onGenerateImage: type === 'imageSetup' ? onGenerateImage : undefined,
        onGenerateVideo: type === 'videoNode' ? onGenerateVideo : undefined,
      }
    };
    setNodes(nds => [...nds, newNode]);
  };

  // Hooking data up to the story planner
  const generateStoryPlan = async (idea: string, style: string, sceneCount: number) => {
    setNodes((nds) => nds.map(n => n.id === 'story-planner' ? { ...n, data: { ...n.data, isLoading: true } } : n));
    try {
      const res = await fetch("/api/story/plan", {
        method: "POST", headers: apiHeaders,
        body: JSON.stringify({ idea, style, sceneCount }),
      });
      const plan = await res.json();
      
      const newNodes: Node[] = [nodes.find(n => n.id === 'story-planner')!];
      const newEdges: Edge[] = [];
      newNodes[0].data.isLoading = false;

      plan.scenes.forEach((scene: any, i: number) => {
        const imageId = `image-${i}`;
        const videoId = `video-${i}`;

        newNodes.push({
          id: imageId,
          type: 'imageSetup',
          position: { x: 450 + (i * 350), y: 300 },
          data: { 
            prompt: `${plan.style}. ${scene.startFramePrompt}`,
            onUpdate: onUpdateNodeData, 
            onGenerateImage 
          }
        });

        newNodes.push({
          id: videoId,
          type: 'videoNode',
          position: { x: 450 + (i * 350), y: 600 },
          data: { 
            prompt: scene.videoMotionPrompt,
            duration: scene.duration,
            onUpdate: onUpdateNodeData, 
            onGenerateVideo 
          }
        });

        if (i === 0) newEdges.push({ id: `e-story-${imageId}`, source: 'story-planner', target: imageId });
        else newEdges.push({ id: `e-img-${i-1}-${imageId}`, source: `image-${i-1}`, target: imageId });

        newEdges.push({ id: `e-${imageId}-${videoId}`, source: imageId, target: videoId });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error(err);
      setNodes((nds) => nds.map(n => n.id === 'story-planner' ? { ...n, data: { ...n.data, isLoading: false } } : n));
    }
  };

  useMemo(() => {
    setNodes((nds) => nds.map(n => ({
      ...n, 
      data: { 
        ...n.data, 
        onGenerate: n.id === 'story-planner' ? generateStoryPlan : n.data.onGenerate,
        onUpdate: onUpdateNodeData,
        onGenerateImage,
        onGenerateVideo
      }
    })));
  }, [apiHeaders, edges]); 

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-primary)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background gap={24} size={2} color="#444" />
        <Controls />
      </ReactFlow>

      {/* Floating Toolbox for Free Graph Navigation */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#222', padding: '8px 16px', borderRadius: 8, display: 'flex', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10 }}>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addNode('storyInput')}>+ Story</button>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => addNode('characterDNA')}>+ Character DNA</button>
        <button className="btn btn-secondary" style={{ fontSize: 12, color: 'var(--green)' }} onClick={() => addNode('imageSetup')}>+ Image Node</button>
        <button className="btn btn-secondary" style={{ fontSize: 12, color: '#3b82f6' }} onClick={() => addNode('videoNode')}>+ Video Node</button>
      </div>
    </div>
  );
}
