# 🚀 QUICK START - Choose Your Setup

## ⚡ ONE COMMAND - FULL DEPLOYMENT

Choose your AI provider based on your hardware:

---

## 🏆 Option 1: vLLM (FASTEST - GPU Required)

**Best for:** Users with NVIDIA GPU (8GB+ VRAM)
**Performance:** 2-3x faster than Ollama
**Cost:** $0/month

### Single Command Setup:

```bash
chmod +x infrastructure/scripts/setup-offline-ai-vllm.sh
./infrastructure/scripts/setup-offline-ai-vllm.sh
```

**What it does automatically:**
1. ✅ Detects your GPU
2. ✅ Downloads Llama 3.2 3B (~6GB)
3. ✅ Downloads Whisper Small (~1GB)
4. ✅ Downloads MiniLM embeddings (~90MB)
5. ✅ Starts vLLM container
6. ✅ Loads model on GPU
7. ✅ Tests everything

**Total time:** 15-20 minutes (mostly downloading)
**Total download:** ~7GB

---

## 🎯 Option 2: Ollama (EASY - CPU Friendly)

**Best for:** Users without GPU or want easy setup
**Performance:** Good (5-15 tokens/sec on CPU)
**Cost:** $0/month

### Single Command Setup:

```bash
chmod +x infrastructure/scripts/setup-offline-ai.sh
./infrastructure/scripts/setup-offline-ai.sh
```

---

## 📊 Performance Comparison

| Provider | Speed | Quality | RAM | GPU | Cost/mo | Setup Time |
|----------|-------|---------|-----|-----|---------|------------|
| **vLLM** | ⚡⚡⚡ | ✅✅✅ | 8GB | Required | $0 | 20 min |
| **Ollama** | ⚡⚡ | ✅✅✅ | 4GB | Optional | $0 | 20 min |
| **OpenAI** | ⚡⚡⚡ | ✅✅✅ | 0 | No | $920 | 2 min |

---

## 🎯 My Recommendation

### If you have NVIDIA GPU:
```bash
./infrastructure/scripts/setup-offline-ai-vllm.sh
```

### If you DON'T have GPU:
```bash
./infrastructure/scripts/setup-offline-ai.sh
```

**That's it! 🎯**
