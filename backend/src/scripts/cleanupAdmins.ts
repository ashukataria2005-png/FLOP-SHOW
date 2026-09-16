import { adminAccountService } from '../services/adminAccountService.js';

async function run() {
  console.log('Running administrator account audit and cleanup...');
  const result = await adminAccountService.ensureSingleAdminAccount();
  console.log('Admin cleanup finished successfully:');
  console.log(`- Canonical Admin ID: ${result.canonicalAdminId}`);
  console.log(`- Canonical Admin Email: ${result.adminEmail}`);
  console.log(`- Extra accounts demoted/cleaned: ${result.cleanedCount}`);
  console.log(`- Total active administrator accounts: ${result.totalAdminsNow}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Admin cleanup failed:', err);
  process.exit(1);
});
