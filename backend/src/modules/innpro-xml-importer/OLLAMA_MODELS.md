# Ollama Models for Translation

This document provides recommendations for Ollama models to use for English to Bulgarian translation and SEO optimization.

## Recommended Models (Best to Good)

### 1. **Gemma3n:e2b** (Recommended - Default)
- **Model**: `gemma3n:e2b`
- **Why**: Best model for English to Bulgarian translation tasks, excellent instruction following, efficient 2B parameter model
- **Quality**: ⭐⭐⭐⭐⭐
- **Speed**: Very Fast
- **RAM**: ~2GB
- **Install**: `ollama pull gemma3n:e2b`

### 2. **Qwen2.5:14b/32b**
- **Model**: `qwen2.5:14b` or `qwen2.5:32b` (if you have enough RAM)
- **Why**: Excellent multilingual support, especially strong for non-English languages including Bulgarian
- **Quality**: ⭐⭐⭐⭐⭐
- **Speed**: Fast
- **RAM**: ~9GB (14b) or ~20GB (32b)
- **Install**: `ollama pull qwen2.5:14b`

### 2. **Mistral 7B/8x7B**
- **Model**: `mistral:7b` or `mixtral:8x7b`
- **Why**: Strong multilingual capabilities, good balance of quality and speed
- **Quality**: ⭐⭐⭐⭐
- **Speed**: Very fast
- **RAM**: ~5GB (7b) or ~48GB (8x7b)
- **Install**: `ollama pull mistral:7b` or `ollama pull mixtral:8x7b`

### 3. **Llama 3.1/3.2**
- **Model**: `llama3.1:8b` or `llama3.2:3b`
- **Why**: Good general-purpose models with decent multilingual support
- **Quality**: ⭐⭐⭐⭐
- **Speed**: Fast
- **RAM**: ~5GB (8b) or ~2GB (3b)
- **Install**: `ollama pull llama3.1:8b` or `ollama pull llama3.2:3b`

### 4. **Gemma 2**
- **Model**: `gemma2:9b` or `gemma2:27b`
- **Why**: Google's model with good multilingual support
- **Quality**: ⭐⭐⭐⭐
- **Speed**: Fast
- **RAM**: ~6GB (9b) or ~16GB (27b)
- **Install**: `ollama pull gemma2:9b`

## Configuration

### Environment Variables

Set in your `.env` file:

```bash
# Ollama URL (default: http://localhost:11434)
OLLAMA_URL=http://localhost:11434

# Ollama Model (default: gemma3n:e2b)
OLLAMA_MODEL=gemma3n:e2b
```

### API Request

You can also override the model per import request:

```json
{
  "shippingProfileId": "sp_...",
  "ollamaUrl": "http://localhost:11434",
  "ollamaModel": "gemma3n:e2b"
}
```

## Model Comparison

| Model | Quality | Speed | RAM | Bulgarian Support |
|-------|---------|-------|-----|-------------------|
| gemma3n:e2b | ⭐⭐⭐⭐⭐ | Very Fast | ~2GB | Excellent (Recommended) |
| qwen2.5:14b | ⭐⭐⭐⭐⭐ | Fast | ~9GB | Excellent |
| qwen2.5:32b | ⭐⭐⭐⭐⭐ | Medium | ~20GB | Excellent |
| mixtral:8x7b | ⭐⭐⭐⭐ | Fast | ~48GB | Very Good |
| mistral:7b | ⭐⭐⭐⭐ | Very Fast | ~5GB | Good |
| llama3.1:8b | ⭐⭐⭐⭐ | Fast | ~5GB | Good |
| llama3.2:3b | ⭐⭐⭐ | Very Fast | ~2GB | Decent |
| gemma2:9b | ⭐⭐⭐⭐ | Fast | ~6GB | Good |

## Testing Models

To test different models:

1. Pull the model: `ollama pull <model-name>`
2. Update environment variable: `OLLAMA_MODEL=<model-name>`
3. Restart the backend
4. Run an import and check translation quality

## Notes

- **Gemma3n:e2b** is the recommended default model for Bulgarian translation - it provides the best quality for this specific task with excellent efficiency (only ~2GB RAM)
- **Qwen2.5** models are also excellent alternatives with strong multilingual capabilities
- Larger models (27b, 32b) generally provide better quality but require more RAM
- For production, `gemma3n:e2b` is recommended for best translation quality and efficiency
- If you need even better quality and have more RAM, `qwen2.5:14b` or `gemma2:27b` are good alternatives
