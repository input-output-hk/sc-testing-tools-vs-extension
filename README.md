<p align="center">
  <img src="images/pbt-logo.png" alt="PBT" width="128" />
</p>

<h1 align="center">PBT for VS Code</h1>

<p align="center">
  Run, explore, and debug property-based tests and threat models for Cardano smart contracts written in Plinth.
</p>

## Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [1. Install the extension](#1-install-the-extension)
  - [2. Open your project](#2-open-your-project)
  - [3. Open the PBT sidebar](#3-open-the-pbt-sidebar)
  - [4. Choose an execution mode](#4-choose-an-execution-mode)
  - [5. Run your tests](#5-run-your-tests)
  - [6. Read the results](#6-read-the-results)

## Overview

Property-based testing finds the edge case you would never have thought to write a test for. PBT brings the entire property-based testing process into one seamless user interface.

- **Nothing to configure:** Write your test suites in your Haskell project as you normally would and PBT picks them up on its own. There is nothing to register on the extension side, no paths to point at, and no settings to keep in sync as the project grows.
- **One place to drive everything:** Run a whole package, a single suite, or one test, and watch status and timings arrive live while the test run is still running.
- **Round-level results:** See the status of every test at a glance, then open a test's result views to inspect the status of each of its rounds and the transactions inside them.
- **Transactions you can actually read:** An interactive graph of any round, with its inputs, outputs, fees, script addresses and datums laid out, plus an explorer for moving through a large round without losing your place.
- **Coverage where you are already looking:** See how much of each Plinth script a test run exercised, both as percentages in the sidebar and as highlighting on the lines of the script itself.


