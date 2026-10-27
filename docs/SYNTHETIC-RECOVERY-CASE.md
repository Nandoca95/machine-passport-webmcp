# Synthetic recovery case

This case is fictional. It is not a copy of a real owner, machine or incident and is not a valid Machine Passport import.

## Scenario

A supervised workstation has an intermittent defect on its internal display.
Accepted observations: the defect reproduces before the operating system loads; a known-good external display is clean; a quick board diagnostic reports PASS; a prior internal service is reported by the owner, but causality is unknown.

## Correct interpretation

The observations support localization to the internal display path and strongly reduce the value of reinstalling software as the first response.
They do not prove which cable, connector, panel or board circuit failed; that the whole board is healthy; that prior service caused the problem; or that the workstation is fully qualified for its intended role.
The quick diagnostic PASS remains bounded to its declared coverage.

## Smallest useful next step

A human-authorized inspection of the internal display connection path before buying parts.

## Workaround

An external display can restore useful supervised work.
Record WORKAROUND_AVAILABLE, PHYSICAL_REPAIR=NO and FITNESS_FOR_USE=UNVERIFIED until representative work is observed.

## Economic decision

Repair-versus-part-out remains pending until the exact failure is narrowed, a real quote exists, intended use is known, and the value of a workaround and selling effort are compared.

## Why this belongs in Machine Passport

The example demonstrates evidence boundaries and decision sequencing, not hardware repair instructions.