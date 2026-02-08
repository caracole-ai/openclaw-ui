#!/usr/bin/env node
/**
 * Auto-Assignees Reconciliation Script
 * Scanne les sessions OpenClaw et synchronise les assignees des projets
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '~';
const PROJECTS_PATH = join(HOME, '.openclaw/projects/projects.json');
const MAPPING_PATH = join(HOME, '.openclaw/channel-project-mapping.json');
const AGENTS_DIR = join(HOME, '.openclaw/agents');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('🧪 Mode dry-run activé\n');

// Charger le mapping canal → projet
function loadMapping() {
  if (!existsSync(MAPPING_PATH)) {
    console.error('❌ Mapping file not found:', MAPPING_PATH);
    process.exit(1);
  }
  return JSON.parse(readFileSync(MAPPING_PATH, 'utf-8'));
}

// Charger les projets
function loadProjects() {
  if (!existsSync(PROJECTS_PATH)) {
    return { projects: [], nextId: 1 };
  }
  return JSON.parse(readFileSync(PROJECTS_PATH, 'utf-8'));
}

// Sauvegarder les projets
function saveProjects(data) {
  writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2));
}

// Récupérer les sessions depuis tous les agents
function getSessions() {
  const sessions = [];
  
  if (!existsSync(AGENTS_DIR)) {
    console.error('⚠️ Agents dir not found');
    return { sessions: [] };
  }
  
  // Scanner tous les dossiers agents
  const agents = readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  for (const agent of agents) {
    const sessionsFile = join(AGENTS_DIR, agent, 'sessions', 'sessions.json');
    if (existsSync(sessionsFile)) {
      try {
        const data = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
        // Ajouter les sessions avec le nom de l'agent
        for (const [key, session] of Object.entries(data)) {
          sessions.push({ key, agentId: agent, ...session });
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  }
  
  return { sessions };
}

// Main
console.log('📋 Chargement du mapping canal → projet...');
const mapping = loadMapping();

console.log('🔍 Récupération des sessions OpenClaw...');
const { sessions } = getSessions();

console.log(`   ${sessions.length} sessions trouvées\n`);

const projectsData = loadProjects();
let modified = false;

// Pour chaque canal mappé
for (const [channelId, channelInfo] of Object.entries(mapping)) {
  const projectId = channelInfo.projectId || channelInfo;
  const channelName = channelInfo.channelName || channelId;
  
  console.log(`📁 Canal: ${channelName}`);
  console.log(`   → Projet: ${projectId}`);
  
  // Trouver le projet
  const project = projectsData.projects?.find(p => p.id === projectId);
  if (!project) {
    console.log(`   ⚠️ Projet non trouvé\n`);
    continue;
  }
  
  if (!project.assignees) project.assignees = [];
  
  // Trouver les agents qui ont des sessions sur ce canal
  for (const session of sessions) {
    const key = session.key || '';
    
    // Check if session is for this channel
    if (!key.includes(channelId)) continue;
    
    // Get agent ID - from session data or extract from key
    let agentId = session.agentId;
    if (!agentId) {
      const match = key.match(/^agent:([^:]+):/);
      if (match) agentId = match[1];
    }
    
    if (!agentId) continue;
    
    // Skip if already assigned
    if (project.assignees.includes(agentId)) {
      console.log(`   ✓ ${agentId} déjà assigné`);
      continue;
    }
    
    console.log(`   ➕ ${agentId} à ajouter`);
    
    if (!DRY_RUN) {
      project.assignees.push(agentId);
      modified = true;
      console.log(`   ✓ ${agentId} ajouté`);
    }
  }
  
  console.log('');
}

if (modified && !DRY_RUN) {
  saveProjects(projectsData);
  console.log('💾 Projets sauvegardés');
}

console.log('✅ Réconciliation terminée');
