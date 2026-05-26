const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Google Sheets imports
content = content.replace(/import\s*\{\s*initAuth[^}]+\}\s*from\s*'[^']*(?:googleSheetsClient)[^']*';\s*/g, '');
content = content.replace(/import\s*\{\s*User\s*as\s*FirebaseUser\s*\}\s*from\s*'firebase\/auth';\s*/g, '');
content = content.replace(/import\s*\{\s*getStoredData,\s*saveStoredData,\s*calculatePdamBill\s*\}\s*from\s*'\.\/data';/g, "import { getStoredData, calculatePdamBill } from './data';");

// 2. Add supabaseService import
if (!content.includes('supabaseService')) {
  content = content.replace(/import\s*\{\s*supabase\s*\}\s*from\s*'\.\/supabaseClient';/, "import { supabase } from './supabaseClient';\nimport { supabaseService } from './supabaseService';");
}

// 3. Add isLoading state
if (!content.includes('const [isLoading, setIsLoading] = useState(true);')) {
  content = content.replace(/const \[data, setData\] = useState\(\(\) => getStoredData\(\)\);/, "const [data, setData] = useState(() => getStoredData());\n  const [isLoading, setIsLoading] = useState(true);");
}

// 4. Remove Google Sheets states up to "Save changes locally to localStorage"
content = content.replace(/\/\/ Google Sheets Integration States[\s\S]*?(?=\/\/ Save changes locally to localStorage)/, '');

// 5. Replace "Save changes locally to localStorage" to "// Handle login success" with Supabase load effect
const supabaseLoadNew = `// Load Data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        const residentsData = await supabaseService.fetchResidents();
        const coordinatorsData = await supabaseService.fetchCoordinators();
        const billingData = await supabaseService.fetchBillingRecords();
        const financeData = await supabaseService.fetchFinancialLogs();

        // Migrate local data if supabase is completely empty
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
  
content = content.replace(/\/\/ Save changes locally to localStorage[\s\S]*?(?=\/\/ Handle login success)/, supabaseLoadNew);

// 6. Replace all syncTable calls with supabaseService calls (Wait, we can just remove them for now to avoid errors, and let React use local state which will update UI immediately, while we also call supabaseService to write asynchronously)
content = content.replace(/\/\/\s*AutoSync asynchronously to Google Sheets\s*syncTable\('[^']+',\s*updated[a-zA-Z]+\);(\s*syncTable\('[^']+',\s*updated[a-zA-Z]+\);)?/g, '');
content = content.replace(/syncTable\('[^']+',[^)]+\);/g, '');

// 7. Inject supabaseService calls into Handlers
// We'll let `setData` handle UI, and we'll add `supabaseService` writes asynchronously inside the handlers where the state is computed.
// Wait, doing this via Regex is too risky. Let's just remove Google Sheets for now, and I will manually inject the DB calls where necessary using multi_replace_file_content.

// 8. Remove the Google Sheets UI Banner completely
content = content.replace(/\{\/\*\s*Google Sheets Connection Status Hub Banner\s*\*\/\}[\s\S]*?(?=\{\/\*\s*Main View Area\s*\*\/\}|\{\/\*\s*Main Content Area\s*\*\/\}|<div className="grid)/, '');

// 9. Remove unused Google icons from lucide-react import
content = content.replace(/,\s*DatabaseZap,\s*ClipboardCheck,\s*Info,\s*X,\s*Check,\s*LogOut,\s*RefreshCw,\s*Layers,\s*FileSpreadsheet,\s*Sparkle,\s*Loader,\s*UploadCloud/, '');

fs.writeFileSync(path, content);
console.log('Refactored App.tsx (Pass 2)');
