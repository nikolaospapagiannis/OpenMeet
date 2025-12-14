import * as dotenv from 'dotenv';
import { RBACService } from './src/services/rbac-service';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Initializing RBAC system...');
  await RBACService.initialize();
  console.log('RBAC initialized successfully!');
  process.exit(0);
}

main().catch((error) => {
  console.error('RBAC initialization failed:', error);
  process.exit(1);
});
