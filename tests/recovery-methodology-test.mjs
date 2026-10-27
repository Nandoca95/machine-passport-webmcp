// Post-challenge recovery-methodology documentation checks.
// This file does not modify the Machine Passport runtime or schema.
import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
const failures = [];

function t(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}`);
  }
}

const raw = readFileSync(new URL('../examples/synthetic-recovery-case.json', import.meta.url), 'utf8');
const example = JSON.parse(raw);
const methodology = readFileSync(new URL('../docs/RECOVERY-METHODOLOGY.md', import.meta.url), 'utf8');
const caseDoc = readFileSync(new URL('../docs/SYNTHETIC-RECOVERY-CASE.md', import.meta.url), 'utf8');
const provenance = readFileSync(new URL('../PROVENANCE.md', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const textSurface = [raw, methodology, caseDoc, provenance, readme].join('\n');

console.log('\n[recovery methodology]');

t('example explicitly synthetic', example.synthetic === true);
t('example explicitly not a passport import', example.not_machine_passport_import === true);
t('example has no real owner data flag', example.privacy?.contains_real_owner_data === false);
t('example has no real serial/path flag', example.privacy?.contains_real_serials_or_paths === false);
t('example has no real photo flag', example.privacy?.contains_real_photos === false);
t('proposed action remains NOT_EXECUTED', example.next_discriminating_action?.execution_state === 'NOT_EXECUTED');
t('workaround is not represented as physical repair', example.workaround?.available === true && example.workaround?.physical_repair === false);
t('fitness remains unverified in teaching case', example.workaround?.fitness_for_use_verified === false);
t('no absolute private user path appears', !/\/Users\//.test(textSurface) && !/[A-Za-z]:\\/.test(textSurface));
t('no email-like value appears', !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(textSurface));
t('no IPv4 literal appears', !/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(textSurface));
t('README preserves original submission identity', readme.includes('f74cb0b5d2deffd058f6cecee643409c324b366d'));
t('public provenance says private history was not copied', provenance.includes('private_git_history_copied=NO'));
t('methodology keeps machine control authority off', methodology.includes('MACHINE_CONTROL_AUTHORITY=NONE'));

console.log(`\n===== RECOVERY DOC RESULT: ${pass} passed, ${fail} failed =====`);
if (fail > 0) {
  console.log('FAILURES:', failures.join('; '));
  process.exit(1);
}