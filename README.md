<p align="center">
  <img src="images/pbt-logo.png" alt="PBT" width="128" />
</p>

<h1 align="center">PBT for VS Code</h1>

<p align="center">
  Run, explore, and debug property-based tests and threat models for Cardano smart contracts written in Plinth.
</p>

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

## Requirements

**Docker or Nix.** PBT runs your test suites using either Docker or Nix. you **MUST HAVE** one of them installed and working in order for the extension to run.

**Docker**: install Docker Desktop or Docker Engine and make sure it is actually running. 
**Nix**: install Nix. 

**Setting your mode for every session.** Which of the two PBT uses is stored in the `pbt-extension.executionMode` setting. It accepts `docker` or `nix` and defaults to `docker`. Because PBT saves it to your User settings, the mode you choose applies to every VS Code session and every workspace until you change it again.

There are two ways to set it, and both write the same value.

**The Test Run Configuration view** in the PBT sidebar is the quickest way while you are working. Choose **NIX** or **Docker** under Execution Mode.

<img src="images/testConfig.png" alt="The Test Run Configuration view showing Rounds Per Test and an Execution Mode choice between NIX and Docker" width="420" />

**The Settings editor** lists it under Extensions, PBT Configuration as **Pbt-extension: Execution Mode**. Searching for `pbt-extension.executionMode` takes you straight to it.

<img src="images/settings.png" alt="The VS Code Settings editor filtered to pbt-extension.executionMode, with the mode set to docker" width="760" />

You can also add it to `settings.json` yourself:

```json
"pbt-extension.executionMode": "docker"
```

One thing to watch: if this setting also has a Workspace value, VS Code uses that one instead, and picking a mode in the sidebar will look like it had no effect. Clear the Workspace value if the mode is not the one you selected.

**A working sc-testing-tools setup.** This extension is the front end. It does not run your tests itself. It launches your test suites and then reads the stream of events they report back, which is what fills in the test tree, the round results, the transaction graphs, and the coverage numbers. All of that comes from [sc-testing-tools](https://github.com/input-output-hk/sc-testing-tools), the testing backend PBT is built on top of.

If sc-testing-tools is not installed and working on your machine, PBT has nothing to run and nothing to display. To install the backend, follow the install instructions in the [sc-testing-tools README](https://github.com/input-output-hk/sc-testing-tools).

## Getting started

### 1. Install the extension

PBT is on the VS Code Marketplace. Open the Extensions view, search for `pbt`, and install the one published by **IOG**.

<img src="images/marketplace.png" alt="The Extensions Marketplace view with a search for pbt, showing the PBT extension published by IOG with an Install button" width="420" />

You can also install it from its [Marketplace page](https://marketplace.visualstudio.com/items?itemName=IOG.pbt-extension) in a browser, or from the command line:

```bash
code --install-extension IOG.pbt-extension
```

**Building from source.** If you would rather run a development build, clone the repository and compile it:

```bash
git clone https://github.com/input-output-hk/sc-testing-tools-vs-extension.git
cd sc-testing-tools-vs-extension
npm install
npm run compile
```

`npm run compile` builds the extension, the server, and the webview UI. Then press <kbd>F5</kbd> to launch a VS Code window with PBT loaded.


