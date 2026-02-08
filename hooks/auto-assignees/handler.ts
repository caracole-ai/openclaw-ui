/**
 * Auto-Assignees Hook
 * 
 * Écoute message:sent et ajoute l'agent aux assignees du projet associé au canal.
 * 
 * ⚠️ NOTE: L'event message:sent n'est pas encore implémenté dans OpenClaw core.
 * Ce handler est prêt pour quand il le sera.
 */

import type { HookHandler } from "openclaw/hooks";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ChannelMapping {
  [channelId: string]: string; // channelId -> projectId
}

interface Project {
  id: string;
  name: string;
  assignees?: string[];
  [key: string]: unknown;
}

interface ProjectsData {
  projects: Project[];
  nextId: number;
}

const CHANNEL_MAPPING_PATH = join(__dirname, "channel-mapping.json");
const PROJECTS_PATH = join(process.env.HOME || "~", ".openclaw/projects/projects.json");
const DASHBOARD_API = process.env.DASHBOARD_API_URL || "http://localhost:3000";

// Patterns de canaux projet
const PROJECT_CHANNEL_PATTERNS = [
  /^delib-/,
  /^proj-/,
  /^🧠/,
];

function isProjectChannel(channelName: string): boolean {
  return PROJECT_CHANNEL_PATTERNS.some(pattern => pattern.test(channelName));
}

async function getProjectIdFromAPI(channelId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DASHBOARD_API}/api/channels/mapping/${channelId}`);
    if (!res.ok) return null;
    const data = await res.json() as { projectId?: string };
    return data.projectId || null;
  } catch {
    return null;
  }
}

function loadChannelMapping(): ChannelMapping {
  if (!existsSync(CHANNEL_MAPPING_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CHANNEL_MAPPING_PATH, "utf-8"));
  } catch {
    console.error("[auto-assignees] Failed to load channel mapping");
    return {};
  }
}

function loadProjects(): ProjectsData {
  if (!existsSync(PROJECTS_PATH)) {
    return { projects: [], nextId: 1 };
  }
  try {
    return JSON.parse(readFileSync(PROJECTS_PATH, "utf-8"));
  } catch {
    console.error("[auto-assignees] Failed to load projects");
    return { projects: [], nextId: 1 };
  }
}

function saveProjects(data: ProjectsData): void {
  writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2));
}

function addAgentToProject(agentId: string, projectId: string): boolean {
  const data = loadProjects();
  const project = data.projects.find(p => p.id === projectId);
  
  if (!project) {
    console.log(`[auto-assignees] Project ${projectId} not found`);
    return false;
  }
  
  if (!project.assignees) {
    project.assignees = [];
  }
  
  if (project.assignees.includes(agentId)) {
    // Already assigned
    return false;
  }
  
  project.assignees.push(agentId);
  saveProjects(data);
  console.log(`[auto-assignees] ✓ Agent ${agentId} added to project ${project.name}`);
  return true;
}

const handler: HookHandler = async (event) => {
  // Only handle message:sent events
  if (event.type !== "message" || event.action !== "sent") {
    return;
  }
  
  const { context } = event;
  const channelId = context.channelId as string | undefined;
  const channelName = context.channelName as string | undefined;
  const agentId = context.agentId as string | undefined;
  
  if (!channelId || !agentId) {
    return;
  }
  
  // Check if this is a project channel
  if (channelName && !isProjectChannel(channelName)) {
    return;
  }
  
  // Get project mapping - try API first, fallback to local file
  let projectId = await getProjectIdFromAPI(channelId);
  
  if (!projectId) {
    const mapping = loadChannelMapping();
    projectId = mapping[channelId];
  }
  
  if (!projectId) {
    console.log(`[auto-assignees] Channel ${channelName || channelId} not mapped to any project`);
    return;
  }
  
  // Add agent to project
  const added = addAgentToProject(agentId, projectId);
  
  if (added) {
    // Emit event for other consumers (future)
    // event.emit?.('agent:joined-project', { agentId, projectId });
    
    event.messages.push(`🔗 Auto-ajouté aux assignees de ${projectId}`);
  }
};

export default handler;
