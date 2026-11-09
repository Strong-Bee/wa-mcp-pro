import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'SkillValidator' });

interface SkillMetadata {
  name: string;
  description: string;
  category: 'development' | 'operations';
  version: string;
  author: string;
  tags: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const SKILLS_DIR = path.join(process.cwd(), 'skills');
const REQUIRED_FIELDS = ['name', 'description', 'category', 'version', 'author', 'tags'];

function findSkillDirs(): string[] {
  const dirs: string[] = [];
  const categories = ['development', 'operations'];

  for (const category of categories) {
    const categoryPath = path.join(SKILLS_DIR, category);
    if (fs.existsSync(categoryPath)) {
      const entries = fs.readdirSync(categoryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(path.join(categoryPath, entry.name));
        }
      }
    }
  }

  return dirs;
}

function validateSkillDir(skillDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    errors.push('Missing SKILL.md file');
    return { valid: false, errors, warnings };
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');

  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    errors.push('Missing YAML frontmatter');
    return { valid: false, errors, warnings };
  }

  let metadata: SkillMetadata;
  try {
    metadata = yaml.load(frontmatterMatch[1]) as SkillMetadata;
  } catch (e) {
    errors.push(`Invalid YAML: ${e}`);
    return { valid: false, errors, warnings };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!metadata[field as keyof SkillMetadata]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate name format
  if (metadata.name) {
    const dirName = path.basename(skillDir);
    if (metadata.name !== dirName) {
      errors.push(`Skill name "${metadata.name}" doesn't match directory name "${dirName}"`);
    }
    if (!/^[a-z-]+$/.test(metadata.name)) {
      errors.push('Skill name must be lowercase with hyphens only');
    }
  }

  // Validate category
  if (metadata.category && !['development', 'operations'].includes(metadata.category)) {
    errors.push('Category must be "development" or "operations"');
  }

  // Check for duplicate names
  // (done after all skills parsed)

  // Check content not empty
  const bodyContent = content.replace(/^---\n[\s\S]*?\n---/, '').trim();
  if (!bodyContent) {
    warnings.push('Skill content is empty');
  }

  // Check for required sections
  const requiredSections = [
    '## Purpose',
    '## When to Use',
  ];
  for (const section of requiredSections) {
    if (!bodyContent.includes(section)) {
      warnings.push(`Missing recommended section: ${section}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateAllSkills(): { valid: boolean; results: Map<string, ValidationResult> } {
  const skillDirs = findSkillDirs();
  const results = new Map<string, ValidationResult>();
  const nameMap = new Map<string, string>();

  for (const skillDir of skillDirs) {
    const result = validateSkillDir(skillDir);
    const skillName = path.basename(skillDir);
    results.set(skillName, result);

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        try {
          const metadata = yaml.load(frontmatterMatch[1]) as SkillMetadata;
          if (metadata.name) {
            if (nameMap.has(metadata.name)) {
              result.errors.push(`Duplicate skill name: ${metadata.name} (also in ${nameMap.get(metadata.name)})`);
            } else {
              nameMap.set(metadata.name, skillName);
            }
          }
        } catch {
          // Ignore parse errors here, already caught
        }
      }
    }
  }

  const allValid = Array.from(results.values()).every(r => r.valid);
  return { valid: allValid, results };
}

function printResults(results: Map<string, ValidationResult>): void {
  console.log('\n=== Skill Validation Results ===\n');

  for (const [skillName, result] of results) {
    const status = result.valid ? '✓' : '✗';
    console.log(`${status} ${skillName}`);

    for (const error of result.errors) {
      console.log(`  ERROR: ${error}`);
    }

    for (const warning of result.warnings) {
      console.log(`  WARNING: ${warning}`);
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('  OK');
    }
    console.log();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';

  switch (command) {
    case 'validate': {
      const { valid, results } = validateAllSkills();
      printResults(results);

      const total = results.size;
      const passed = Array.from(results.values()).filter(r => r.valid).length;
      console.log(`Summary: ${passed}/${total} skills valid`);

      if (!valid) {
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const skillDirs = findSkillDirs();
      console.log('\n=== Available Skills ===\n');
      for (const skillDir of skillDirs) {
        const skillMdPath = path.join(skillDir, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf8');
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            try {
              const metadata = yaml.load(frontmatterMatch[1]) as SkillMetadata;
              console.log(`  ${metadata.name} (${metadata.category}) - ${metadata.description}`);
            } catch {
              console.log(`  ${path.basename(skillDir)} - Invalid SKILL.md`);
            }
          }
        }
      }
      console.log();
      break;
    }

    case 'check': {
      const { valid, results } = validateAllSkills();
      printResults(results);
      if (!valid) process.exit(1);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Usage: validate-skills [validate|list|check]');
      process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Skill validation failed');
  process.exit(1);
});