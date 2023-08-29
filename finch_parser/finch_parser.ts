import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { variations as proto } from './generated/proto_bundle';
import { type ProcessingOptions, downloadUrl, getSeedPath, getStudyPath } from './utils';
import { ProcessedStudy, StudyPriority } from './study_classifier';
import { makeSummary, summaryToText } from './summary';
import { studyToJSON } from './serializers';
import { execSync } from 'child_process';


async function fetchChromeSeedData(): Promise<Buffer> {
  const kChromeSeedUrl = 'https://clientservices.googleapis.com/chrome-variations/seed';
  return await downloadUrl(kChromeSeedUrl);
}


function serializeStudiesToDirectory(seedData: Buffer, directory: string, options: ProcessingOptions): void {
  const seed = proto.VariationsSeed.decode(seedData);
  const exps = new Map<string, unknown[]>();
  let cnt = 0;
  const addStudy = (path: string, study: proto.IStudy): void => {
    const json = studyToJSON(study);
    const list = exps.get(path);
    if (list !== undefined)
      list.push(json);
    else
      exps.set(path, [json]);
    cnt++;
  };

  for (const study of seed.study) {
    const name = study.name;
    const processed = new ProcessedStudy(study, options);
    addStudy(path.join('by-name', name), study);
    if (processed.getPriority() >= StudyPriority.STABLE_ALL)
      addStudy(path.join('stable-100%', name), study);

    if (processed.getPriority() >= StudyPriority.STABLE_MIN)
      addStudy(path.join('stable', name), study);

    if (processed.getPriority() === StudyPriority.BLOCKLISTED)
      addStudy(path.join('blocklisted', name), study);
  }

  console.log(`${cnt} studies processed`);
  for (const [name, json] of exps) {
    const fileName = `${directory}/${name}`;
    const dirname = path.dirname(fileName);
    fs.mkdirSync(dirname, { recursive: true });
    fs.writeFileSync(fileName, JSON.stringify(json, null, 2) + '\n');
  }
}

function commitAllChanges(directory: string): void {
  const utcDate = new Date().toUTCString();
  const diff = execSync('git status --porcelain', { cwd: directory });
  if (diff.length <= 2) {
    console.log('Nothing to commit');
    return;
  }
  execSync('git add -A', { cwd: directory });
  execSync(`git commit -m "Update seed ${utcDate}"`, { cwd: directory });
}

function storeDataToDirectory(seedData: Buffer, directory: string, options: ProcessingOptions): void {
  const studyDirectory = getStudyPath(directory);
  fs.rmSync(studyDirectory, { recursive: true, force: true });
  serializeStudiesToDirectory(seedData, studyDirectory, options);

  // TODO: maybe use s3 instead of git?
  fs.writeFileSync(getSeedPath(directory), seedData);
}


async function main(): Promise<void> {
  const program = new Command();
  program.description('Chrome finch parser');
  program.version('0.0.1');
  program.argument('<finch_storage>', '');
  program.argument('[current_seed_file]', '');
  program.argument('[previous_seed_file]', '');
  program.option('-m, --chrome-major <value>', '');
  program.parse();

  const storageDir = program.args[0];
  const seedFile = program.args[1];
  const previousSeedFile = program.args[2];
  const options = { minMajorVersion: program.opts().chromeMajor };

  const createSummary = true;
  const updateData = true;
  const commitData = false;

  const seedData = seedFile !== undefined ? fs.readFileSync(seedFile) : await fetchChromeSeedData();
  const seed = proto.VariationsSeed.decode(seedData);

  if (createSummary) {
    const previousSeedData = fs.readFileSync(previousSeedFile ?? getSeedPath(storageDir));

    const previousSeed = proto.VariationsSeed.decode(previousSeedData);
    const summary = makeSummary(previousSeed, seed, options);
    console.log(summaryToText(summary));
  }

  if (updateData) {
    storeDataToDirectory(seedData, storageDir, options);
    if (commitData)
      commitAllChanges(storageDir);
  }
}

void main();