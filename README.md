<div align="center">
  <h1>🎬 FAL Studio: Cinematic AI Video Pipeline</h1>
  <p><i>The Ultimate Node-Based Workspace for AI Filmmakers</i></p>

  <p>
    <a href="https://reactflow.dev/"><img src="https://img.shields.io/badge/React%20Flow-Node%20Editor-FF0072?style=for-the-badge&logo=react" alt="React Flow" /></a>
    <a href="https://fal.ai/"><img src="https://img.shields.io/badge/fal.ai-AI%20Inference-000000?style=for-the-badge" alt="fal.ai" /></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  </p>
</div>

---

**FAL Studio** is a Next-Generation AI Video generation workspace built for the era of professional AI filmmaking. Moving beyond simple text-to-video prompts, it combines the structural narrative power of **LTX Studio** with the infinite flexibility of a **ComfyUI-style Node Graph**.

No more linear generators. Build your movie scene by scene, wire your frames together, lock your character DNA, and render complex multi-shot sequences in parallel.

## 🚀 Killer Features

### 🕸️ The "Free Graph" Architecture
Say goodbye to rigid pipelines. Build your own generation logic on an infinite canvas using **React Flow**.
- **`+ Story Node`**: Generate a multi-scene film plan (prompts, camera angles, timing) via OpenAI.
- **`+ Image Node`**: Generate perfect base frames using high-end models like `Flux.1 Schnell` or `Midjourney`.
- **`+ Video Node`**: Connect your ideal Image Node to a Video Node, set the camera movement, and run it through `Seedance 2.0`, `Kling 3.0`, or `Veo 3.1`.

### 🧬 Absolute "Character DNA" Lock
Achieve 100% face and character consistency across your entire film. 
Spawn a **Character DNA** node, upload your reference image directly to `fal.storage`, and drag connections to every Scene in your graph. Every connected node will respect the reference identity.

### 🎧 Native Audio Sync
Video models that support audio (like Seedance 2.0) are automatically fed contextual audio cues generated dynamically by the LLM. You get perfectly synced Sound Effects (SFX) straight out of the box—no post-production required.

### 🎬 Director's Timeline Player
Your graph doesn't just generate fragmented files. Switch to timeline mode to seamlessly Auto-Play your entire node chain as a contiguous, cinematic short film. 

---

## 🛠️ Installation & Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/Kiwunaka/falworkflowtest.git
   cd falworkflowtest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   # Required for AI model execution
   FAL_KEY="your_fal_ai_key_here"
   
   # Required for the Story Planner (Idea -> Scenes)
   OPENAI_API_KEY="your_openai_key_here"
   ```

4. **Run the Studio**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` and click on the **"Node Editor ⚡"** tab to start building!

---

## 🧠 How it Works Under the Hood

- **State Management:** Fully reactive custom React Flow hooks. Nodes are autonomous; they pull data from upstream connected edges right before execution.
- **Lazy Evaluation:** Video nodes won't run until their required Image nodes have successfully finished generating a `Start Frame`.
- **Parallel Processing:** Hit "Generate" on 5 different video nodes simultaneously. The Fal client proxy handles asynchronous queueing, meaning you render whole sequences in the time it takes to render one clip.

<div align="center">
  <sub>Built for the future of synthetic media. Make movies, not clips.</sub>
</div>
