# What is Janus?

## 1. Overview

Janus is a governance core for systems where humans, software, and AI participate in decision processes.

Janus does not execute business logic.
It governs how system evolution is evaluated, recorded, and reconstructed.

## 2. The Problem

Most systems record what happened.
Very few systems record what should have happened but did not.

This becomes critical in systems involving automation and AI, where omissions and missing validations can create risk.

## 3. The Janus Approach

Key ideas:
- governance events
- evidence model (E+ / E-)
- human authority
- audit writer boundary
- deterministic rebuild

Janus evaluates governance conditions rather than application logic.

## 4. What Janus Is Not

Janus is not:
- a framework
- a workflow engine
- an orchestration system
- an application platform

Janus is a governance layer that can operate above many different systems.

## 5. How It Works

activity → evaluation → governance event → audit log → rebuildable state

## 6. Reference Runtime

runtime/demo-node/

It demonstrates the model with a minimal executable implementation.

## 7. Principle

Janus governs system evolution.  
Runtimes execute governance evaluation.
