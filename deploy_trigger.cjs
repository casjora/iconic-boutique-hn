const fs = require('fs');
const { execSync } = require('child_process');

// Extraer el texto de products_view_dml
const schema = fs.readFileSync('supabase-schema.sql', 'utf8');

// Find the function and trigger
const functionMatch = schema.match(/CREATE OR REPLACE FUNCTION public\.products_view_dml\(\)[\s\S]*?LANGUAGE plpgsql\s+SECURITY DEFINER;/i);

if (functionMatch) {
  const sql = functionMatch[0];
  fs.writeFileSync('trigger.sql', sql);
  
  const cmd = `curl -s -X POST "https://nsubmnvkojsmoykfcjgl.supabase.co/rest/v1/rpc/exec_sql" \\
    -H "apikey: sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e" \\
    -H "Authorization: Bearer sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e" \\
    -H "Content-Type: application/json" \\
    -d JSON_PAYLOAD`;
    
  const payload = JSON.stringify({ query: sql });
  fs.writeFileSync('payload.json', payload);
  
  const cmdRun = `curl -s -X POST "https://nsubmnvkojsmoykfcjgl.supabase.co/rest/v1/rpc/exec_sql" \\
    -H "apikey: sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e" \\
    -H "Authorization: Bearer sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e" \\
    -H "Content-Type: application/json" \\
    -d @payload.json`;
    
  console.log(execSync(cmdRun).toString());
} else {
  console.log('Function not found');
}
