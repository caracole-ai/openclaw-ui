import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { command } = body;
  
  if (command !== 'extract-agents') {
    throw createError({
      statusCode: 400,
      message: 'Unknown command'
    });
  }
  
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract-agents.py');
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);
    
    return {
      success: true,
      output: stdout,
      error: stderr
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    });
  }
});
