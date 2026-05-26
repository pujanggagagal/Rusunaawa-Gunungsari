import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Imports
content = content.replace(
  /import \{\s*initAuth[\s\S]*?\} from '\.\/googleSheetsClient';\nimport \{ User as FirebaseUser \} from 'firebase\/auth';\n/,
  ''
);

content = content.replace(
  /import \{ supabase \} from '\.\/supabaseClient';/,
  "import { supabase } from './supabaseClient';\nimport { supabaseService } from './supabaseService';"
);

// 2. Remove states up to `loadDataFromSheets` and auth init
// We will replace everything from `// Google Sheets Integration States` to `// Read data from Google spreadsheets`
const startSheetsStates = content.indexOf('  // Google Sheets Integration States');
const endSheetsStates = content.indexOf('  // Handle login success');

if (startSheetsStates !== -1 && endSheetsStates !== -1) {
  const replacement = `  const [isLoading, setIsLoading] = useState(true);

  // Load Data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        const residentsData = await supabaseService.fetchResidents();
        const coordinatorsData = await supabaseService.fetchCoordinators();
        const billingData = await supabaseService.fetchBillingRecords();
        const financeData = await supabaseService.fetchFinancialLogs();

        if (residentsData.length === 0 && coordinatorsData.length === 0) {
           const localData = getStoredData();
           if (localData.residents.length > 0) {
             await supabaseService.bulkInsertResidents(localData.residents);
             await supabaseService.bulkInsertCoordinators(localData.coordinators);
             await supabaseService.bulkInsertBillingRecords(localData.billing);
             await supabaseService.bulkInsertFinancialLogs(localData.finance);
             setData(localData);
           }
        } else {
          setData(prev => ({
            ...prev,
            residents: residentsData,
            coordinators: coordinatorsData,
            billing: billingData,
            finance: financeData
          }));
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSupabaseData();
  }, []);

`;
  content = content.substring(0, startSheetsStates) + replacement + content.substring(endSheetsStates);
}

// 3. Remove `syncTable` definition
const syncTableStart = content.indexOf('  // Push updates to Google Sheets client');
const syncTableEnd = content.indexOf('  // Handle login');
if (syncTableStart !== -1 && syncTableEnd !== -1 && syncTableStart < syncTableEnd) {
  content = content.substring(0, syncTableStart) + content.substring(syncTableEnd);
}

// 4. Remove all `syncTable('xyz', updatedXyz);`
content = content.replace(/\s*\/\/\s*AutoSync asynchronously to Google Sheets\n\s*syncTable\([^;]+\);\s*(syncTable\([^;]+\);\s*)?/g, '');

// 5. Remove Google UI banner
const bannerStart = content.indexOf('      {/* Google Sheets Connection Status Hub Banner */}');
const bannerEnd = content.indexOf('      {/* Main Content Area */}');
if (bannerStart !== -1 && bannerEnd !== -1) {
  content = content.substring(0, bannerStart) + content.substring(bannerEnd);
}

// 6. Delete googleSheetsClient file to ensure it's gone
try {
  fs.unlinkSync('src/googleSheetsClient.ts');
} catch(e){}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('App.tsx successfully refactored');
