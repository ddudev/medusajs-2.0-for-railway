# InnPro XML Importer Module

This module provides functionality to import products from InnPro XML feeds into MedusaJS, including automatic translation to Bulgarian using Ollama AI.

## Features

- **XML Product Import**: Parse and import products from InnPro XML format
- **AI Translation**: Automatic translation from English to Bulgarian using Ollama
- **SEO Optimization**: AI-powered SEO optimization for product descriptions
- **Category & Brand Management**: Automatic creation and translation of categories and brands
- **Image Processing**: Download and process product images
- **Variant Support**: Handle multiple product variants with different sizes/prices

## Documentation

- **[Railway Ollama Setup Guide](./RAILWAY_OLLAMA_SETUP.md)** - How to configure Railway-hosted Ollama instance
- **[Ollama Models Guide](./OLLAMA_MODELS.md)** - Recommended models for translation
- **[XML Structure Documentation](./STRUCTURE.md)** - Complete InnPro XML product structure reference

## Quick Start

### 1. Configure Ollama

**For Railway-hosted Ollama:**
See [RAILWAY_OLLAMA_SETUP.md](./RAILWAY_OLLAMA_SETUP.md) for detailed instructions.

**Quick setup:**
1. Set environment variables in Railway:
   ```bash
   OLLAMA_URL=https://your-ollama-service.up.railway.app
   OLLAMA_MODEL=gemma3n:e2b
   ```

**For local Ollama:**
1. Install and run Ollama locally: https://ollama.ai
2. Pull a model: `ollama pull gemma3n:e2b`
3. Set in `.env`:
   ```bash
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=gemma3n:e2b
   ```

### 2. Use the Importer

1. Go to Admin UI → InnPro XML Importer
2. Upload an XML file
3. Review parsed products
4. Start import (translations will happen automatically)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama API endpoint URL |
| `OLLAMA_MODEL` | No | `gemma3:latest` | Model name for translations |

## API Endpoints

- `POST /admin/innpro-importer/sessions` - Create import session
- `POST /admin/innpro-importer/sessions/:id/parse` - Parse XML file
- `POST /admin/innpro-importer/sessions/:id/import` - Start import workflow

### Import Request Parameters

```json
{
  "shippingProfileId": "sp_...",
  "ollamaUrl": "https://your-ollama-service.up.railway.app",  // Optional override
  "ollamaModel": "gemma3n:e2b"  // Optional override
}
```

## Recommended Models

- **`gemma3n:e2b`** (Recommended) - Best for Bulgarian translation, ~2GB RAM
- **`qwen2.5:14b`** - Excellent quality, ~9GB RAM
- **`mistral:7b`** - Good balance, ~5GB RAM

See [OLLAMA_MODELS.md](./OLLAMA_MODELS.md) for full recommendations.

## Troubleshooting

### Connection Issues

If you're having trouble connecting to Railway-hosted Ollama:

1. **Verify Ollama is accessible:**
   ```bash
   curl https://your-ollama-service.up.railway.app/api/tags
   ```

2. **Check environment variables:**
   - Ensure `OLLAMA_URL` uses `https://` (not `http://`)
   - Verify the URL doesn't include a port number
   - Check Railway service is running

3. **Check model is available:**
   ```bash
   curl https://your-ollama-service.up.railway.app/api/tags
   ```
   Verify your model appears in the list

See [RAILWAY_OLLAMA_SETUP.md](./RAILWAY_OLLAMA_SETUP.md) for detailed troubleshooting.

## Workflow

The import process follows these steps:

1. **Parse XML** - Extract products from XML file
2. **Map Products** - Convert to MedusaJS format
3. **Translate Products** - Translate titles and descriptions to Bulgarian
4. **Optimize SEO** - Generate SEO-optimized descriptions
5. **Process Categories & Brands** - Create/translate categories and brands
6. **Process Images** - Download and upload product images
7. **Import Products** - Create products in MedusaJS

## Support

For issues or questions:
1. Check the documentation files in this directory
2. Review Railway Ollama service logs
3. Check MedusaJS backend logs for errors
4. Verify environment variables are set correctly
