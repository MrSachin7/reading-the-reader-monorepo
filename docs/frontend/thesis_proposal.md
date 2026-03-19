# Adaptive Reading Systems: A Modular Software Architecture

*(Adaptive læsesystemer: En modulær softwarearkitektur)*

**Candidates:**
Sachin Baral ([s243871@dtu.dk](mailto:s243871@dtu.dk))
Satish Gurung ([s243872@dtu.dk](mailto:s243872@dtu.dk))

**Degree Programme:** MSc in Computer Science and Engineering
**ECTS Credits:** 30 ECTS each (60 ECTS total)
**Planned Start Date:** 2 February 2026

---

# 1. Introduction

Reading practices have remained largely static despite major advances in interactive computing, sensing technologies, and adaptive systems. The **Reading the Reader (RtR)** project is an interdisciplinary research initiative that aims to improve reading performance, accessibility, and user comfort by dynamically adapting text presentation to individual readers. The project leverages real-time behavioural and physiological data such as eye movements, fixations, and pupil dilation to infer reading states and adjust typography and layout properties accordingly [2].

The long-term goal of Reading the Reader is to develop adaptive reading systems that personalize text presentation in real time, supporting a wide range of readers, including individuals with reading difficulties or visual impairments. Prior work within the project combines methods from human–computer interaction, machine learning, cognitive science, and typographic design to explore how reading behaviour can be sensed, modelled, and supported through adaptive interfaces [3].

A key concept emerging from this work is the use of **micro-interventions**: small, context-preserving changes to typography or layout that aim to support the reader without causing noticeable disruption. Examples include subtle adjustments to line spacing, font weight, or contrast based on inferred reading difficulty. While such interventions have shown promise, their integration into adaptive systems raises significant software engineering challenges, particularly with respect to **modularity, extensibility, and deployment** [4].

---

# 2. Problem Statement

The current Reading the Reader prototype integrates sensing, intervention logic, and user interface behaviour in a tightly coupled manner. As a result, introducing new micro-intervention techniques or replacing existing decision logic — such as swapping an AI-based decision mechanism with a manually controlled intervention — requires extensive code changes and limits experimental flexibility.

Furthermore, the existing system provides limited support for experimental workflows. Researchers cannot easily observe, in real time, exactly what a test subject is seeing, nor can they apply or override interventions from a separate interface. This makes it difficult to compare automated interventions with human-in-the-loop approaches or to conduct controlled usability studies.

From a user-experience perspective, adaptive reading systems must also ensure that interventions preserve reading context and support a smooth, rhythmic flow. Poorly timed or abrupt adaptations risk increasing cognitive load and disrupting the reading experience.

The problem addressed in this thesis is therefore **how to engineer an adaptive reading application that is both experimentally flexible and user-centred**, enabling adaptive micro-interventions that measurably improve the reading experience while remaining **modular, testable, and deployable**.

---

# 3. Research Objectives and Expected Outcome

The objectives and expected outcome of this thesis are to:

1. **Design a modular software-engineered architecture** for an adaptive reading application that clearly separates:

   * sensing
   * decision-making strategies for micro-interventions
   * user interface adaptation

2. **Implement a full adaptive reading application** that supports just-in-time micro-interventions aimed at enhancing legibility.

3. **Develop a paradigm that mirrors the test subject’s reading view in real time** and allows micro-interventions to be applied from a secondary screen.

4. **Validate the proposed system** using standard software engineering and HCI practices, including user studies and usability metrics focusing on:

   * perceived readability
   * smoothness of interaction
   * perceived disruption

5. **Produce architectural documentation and design guidelines** to support future development and experimentation within the Reading the Reader project.

---

# 4. Research Questions

1. **How might we design a modular software architecture** that supports interchangeable adaptive micro-interventions for adaptive reading while enhancing legibility, rhythmic reading flow, and low perceived cognitive load?

2. **How might we support both AI-based automation and human-controlled intervention within the same system** without increasing architectural complexity?

3. **How might we design and apply just-in-time micro-interventions** that improve pleasant readability and rhythmic reading flow without increasing perceived disruption or cognitive load?

4. **How might we enable researchers to observe and interact with the reading experience of a test subject in real time** to support systematic experimentation and validation?

---

# 5. Literature Review

Eye-tracking research has shown that fixation duration, regressions, and pupil dilation are reliable indicators of reading difficulty and cognitive load [5]. These signals provide a strong foundation for adaptive reading systems that respond dynamically to reader behaviour.

Within the Reading the Reader project, prior studies have demonstrated how gaze and pupil-based measures can inform adaptive text presentation and context-preserving interface design. Research on context preservation indicates that gradual, subtle adaptations lead to faster reading resumption and lower perceived disruption compared to abrupt changes [3].

The concept of **micro-interventions** originates from digital health and adaptive systems research, where small, well-timed actions are used to influence behaviour without interrupting ongoing tasks [4]. These principles align closely with adaptive reading, where interventions must be **precise, minimal, and reversible**.

From a software engineering perspective, adaptive systems benefit from architectures that **decouple data acquisition, decision logic, and presentation**. Such modular designs improve maintainability, support experimentation, and facilitate deployment in real-world settings [6].

This thesis applies these architectural principles directly to the design of an adaptive reading application.

---

# 6. Planned Methods

This project will follow a **software engineering–centred approach** informed by HCI, cognitive load theory, and adaptive interface research.

The work will proceed in four phases:

### 1. Literature Review

Study adaptive reading systems, eye-tracking–based reading models, and just-in-time micro-interventions, including prior work in the Reading the Reader project.

### 2. System Analysis

Examine the existing application to identify architectural limitations and derive requirements for:

* modularity
* experimentation
* intervention flexibility

### 3. Architectural Design

Develop a **modular architecture** separating:

* sensing
* intervention logic
* user interface

The architecture will include:

* a central intervention interface supporting multiple decision sources
* an experimenter view for observation and control

### 4. Implementation and Evaluation

Build the adaptive reading system iteratively with:

* unit testing
* integration testing

Evaluation will measure:

* usability
* reading flow
* user experience
* impact of micro-interventions

using validation studies.

---

# 7. References

[1] P. Bækgaard, *Reading the Reader project overview*, DTU Compute.
[https://people.compute.dtu.dk/pgba/research/reading-the-reader/](https://people.compute.dtu.dk/pgba/research/reading-the-reader/)

[2] Ilyas, C. M. A., Noor, S.-E., Tashk, A., Cooreman, B., Beier, S., & Bækgaard, P. (2025).
*Reading the Reader’s Mind through Eye Tracking: Can AI-Generated Texts Match Human Authors?*
Proceedings of the ACM Symposium on Eye Tracking Research & Applications (ETRA).

[3] Jensen, H. E., Ilyas, C. M. A., Tashk, A., Cooreman, B., Beier, S., & Bækgaard, P. (2025).
*Context Preservation through Eye Tracking: Design and Evaluation of Adaptive Reading Interventions.*
ETRA 2025.

[4] Persson, D. R., Ramasawmy, M., Khan, N., Banerjee, A., Blandford, A., Bardram, J. E., & Bækgaard, P. (2025).
*A Design Framework for Micro-Intervention Software Technology in Digital Health: Critical Interpretive Synthesis.*
Journal of Medical Internet Research.

[5] Rayner, K. (1998).
*Eye Movements in Reading and Information Processing: 20 Years of Research.*
Psychological Bulletin, 124(3).

[6] Taylor, R. N., Medvidovic, N., & Dashofy, E. M. (2014).
*Software Architecture: Foundations, Theory, and Practice.*
Wiley.
