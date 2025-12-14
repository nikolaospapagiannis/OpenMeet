import re

# Read the file
with open('src/services/transcription.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic code block
old_code = '''// When AI service runs in Docker, replace localhost with host.docker.internal
        // so the container can access the host's MinIO service
        const dockerS3Endpoint = process.env.DOCKER_S3_ENDPOINT;
        const aiServiceIsLocal = aiServiceUrl?.includes('localhost') || aiServiceUrl?.includes('127.0.0.1');
        if (aiServiceIsLocal) {
          // AI service is local, keep localhost URL - works with public bucket
        } else if (dockerS3Endpoint) {
          // Use configured Docker-accessible endpoint
          audioUrl = audioUrl.replace('http://localhost:4006', dockerS3Endpoint);
        } else if (process.env.USE_LOCAL_TRANSCRIPTION === 'true') {
          // Default: replace localhost with host.docker.internal for Docker access
          audioUrl = audioUrl.replace(/localhost/g, 'host.docker.internal');
        }'''

new_code = '''// AI service runs in Docker, so it cannot access localhost:4006
        // Rewrite URL to use host.docker.internal so container can reach host's MinIO
        // Also strip query params since bucket is public (avoids signature mismatch)
        if (process.env.USE_LOCAL_TRANSCRIPTION === 'true') {
          // Extract just the path without query params (bucket is public)
          const urlObj = new URL(audioUrl);
          const cleanPath = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
          // Replace localhost with host.docker.internal for Docker access
          audioUrl = cleanPath.replace(/localhost/g, 'host.docker.internal');
        }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/services/transcription.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: File updated')
else:
    print('ERROR: Old code block not found')
    print('Looking for similar patterns...')
    if 'aiServiceIsLocal' in content:
        print('Found aiServiceIsLocal in content')
    if 'USE_LOCAL_TRANSCRIPTION' in content:
        print('Found USE_LOCAL_TRANSCRIPTION in content')
