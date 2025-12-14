const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/services/transcription.ts', 'utf-8');

// Replace the problematic code block
const oldCode = `// When AI service runs in Docker, replace localhost with host.docker.internal
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
        }`;

const newCode = `// AI service runs in Docker, so it cannot access localhost:4006
        // Rewrite URL to use host.docker.internal so container can reach host's MinIO
        // Also strip query params since bucket is public (avoids signature mismatch)
        if (process.env.USE_LOCAL_TRANSCRIPTION === 'true') {
          // Extract just the path without query params (bucket is public)
          const urlObj = new URL(audioUrl);
          const cleanPath = \`\${urlObj.protocol}//\${urlObj.host}\${urlObj.pathname}\`;
          // Replace localhost with host.docker.internal for Docker access
          audioUrl = cleanPath.replace(/localhost/g, 'host.docker.internal');
        }`;

if (content.includes(oldCode)) {
    const newContent = content.replace(oldCode, newCode);
    fs.writeFileSync('src/services/transcription.ts', newContent, 'utf-8');
    console.log('SUCCESS: File updated');
} else {
    console.log('ERROR: Old code block not found');
    if (content.includes('aiServiceIsLocal')) {
        console.log('Found aiServiceIsLocal in content');
    }
    if (content.includes('USE_LOCAL_TRANSCRIPTION')) {
        console.log('Found USE_LOCAL_TRANSCRIPTION in content');
    }
}
