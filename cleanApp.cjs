const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Inject supabaseService import
content = content.replace("import { supabase } from './supabaseClient';", "import { supabase } from './supabaseClient';\nimport { supabaseService } from './supabaseService';");

// 2. Add isLoading
content = content.replace("const [data, setData] = useState(() => getStoredData());", "const [data, setData] = useState(() => getStoredData());\n  const [isLoading, setIsLoading] = useState(true);");

// 3. Hijack initialization in useEffect to inject data into supabase
const supabaseInit = `// Migrate local data if supabase is completely empty
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
            residents: residentsData.map(toCamelCase),
            coordinators: coordinatorsData.map(toCamelCase),
            billing: billingData.map(toCamelCase),
            finance: financeData.map(toCamelCase)
          }));
        }`;

content = content.replace(`          setData(prev => ({
            ...prev,
            residents: residentsData.map(toCamelCase),
            coordinators: coordinatorsData.map(toCamelCase),
            billing: billingData.map(toCamelCase),
            finance: financeData.map(toCamelCase)
          }));`, supabaseInit);

content = content.replace(`} catch (err) {
        console.error('Error loading Supabase data:', err);
      }`, `} catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoading(false);
      }`);

// 4. Hijack syncTable
const newSyncTable = `// Push updates to Google Sheets client
  const syncTable = async (table: 'Residents' | 'Coordinators' | 'Billing' | 'Finance', updatedList: any[]) => {
    try {
      if (table === 'Residents') await supabaseService.bulkInsertResidents(updatedList);
      if (table === 'Coordinators') await supabaseService.bulkInsertCoordinators(updatedList);
      if (table === 'Billing') await supabaseService.bulkInsertBillingRecords(updatedList);
      if (table === 'Finance') await supabaseService.bulkInsertFinancialLogs(updatedList);
    } catch (err: any) {
      console.error(\`Gagal melakukan autosync tabel "\${table}" ke Supabase:\`, err);
    }
  };`;

const oldSyncTableStart = content.indexOf('  // Push updates to Google Sheets client');
const oldSyncTableEnd = content.indexOf('  // Sign In');
if (oldSyncTableStart !== -1 && oldSyncTableEnd !== -1) {
    content = content.substring(0, oldSyncTableStart) + newSyncTable + '\n\n' + content.substring(oldSyncTableEnd);
}

// 5. Remove Google Sheets Connection Status Hub Banner
const bannerStart = content.indexOf('      {/* Google Sheets Connection Status Hub Banner */}');
const bannerEnd = content.indexOf('      {/* Main Container Workspace Area */}');
if (bannerStart !== -1 && bannerEnd !== -1) {
    content = content.substring(0, bannerStart) + content.substring(bannerEnd);
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('App.tsx rewritten seamlessly.');
