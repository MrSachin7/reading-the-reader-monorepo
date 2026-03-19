# Adaptive Reading System — Requirements

---

# User Stories

The following user stories describe the expected behaviour of the system from the perspective of its primary actors: the **Test Subject** and the **Researcher**.

---

# A. Eye Tracker Integration and Calibration

1. **As a researcher**, I want the system to automatically detect connected eye trackers, so that I do not need to configure hardware manually.

2. **As a researcher**, I want to select a detected eye tracker and provide the appropriate license file, so that the device can be used within the application.

3. **As a researcher**, I want to perform calibration within the application, so that I do not need to use external software tools.

4. **As a researcher**, I want to see calibration quality metrics before starting a session, so that I can ensure reliable gaze-to-content mapping.

5. **As a system**, I must prevent session start if calibration has not been successfully completed.

---

# B. Reading and Presentation

6. **As a test subject**, I want to read text (plain text or PDF) within the application, so that experiments can use realistic material.

7. **As a test subject**, I want visual presentation presets (contrast, background, typography), so that reading remains comfortable.

8. **As a researcher**, I want to lock visual presets per session, so that experimental conditions remain consistent.

---

# C. Real-Time Observation and Control

9. **As a researcher**, I want a second-screen interface that mirrors the subject’s reading view in real time, so that I can observe the session accurately.

10. **As a researcher**, I want to manually trigger or override micro-interventions, so that I can compare human-controlled and automated behaviour.

11. **As a researcher**, I want to see when and why interventions are triggered, so that I can interpret results reliably.

---

# D. Automated Decision Strategies

12. **As a system**, I want to support multiple decision strategies (AI-based, rule-based, manual), so that intervention triggering is interchangeable.

13. **As a researcher**, I want to enable or disable decision strategies per session, so that I can run controlled experimental conditions.

---

# E. Context Preservation and Reading Flow

14. **As a test subject**, I want my place in the text to remain visually stable when an intervention changes layout, so that reading flow is not disrupted.

15. **As a system**, I want to anchor the currently read word or line during layout changes, so that context is preserved.

---

# F. Minimal Setup and Operational Simplicity

16. **As a researcher**, I want to run the entire system from a single application launch, so that setup hazards are minimized.

17. **As a researcher**, I want a guided session workflow
    (device → license → calibration → content → session), so that I avoid configuration errors.

---

# G. Data Logging and Export

18. **As a researcher**, I want to export session data in JSON and CSV formats, so that I can analyze it in external tools.

19. **As a researcher**, I want session exports to include:

* gaze data
* intervention events
* configuration metadata
* calibration results
* annotations

so that experiments are reproducible.

20. **As a researcher**, I want to annotate sessions during runtime, so that qualitative observations are preserved.

---

# Functional Requirements (FR)

---

# FR1 — System Execution and Setup

* **FR1.1** The system shall be executable through a single application launch or command.

* **FR1.2** The system shall guide the researcher through a structured setup workflow.

* **FR1.3** The system shall prevent session start until mandatory setup steps
  (device selection, license validation, calibration) are completed successfully.

---

# FR2 — Eye Tracker Detection and Licensing

* **FR2.1** The system shall detect connected eye trackers dynamically.

* **FR2.2** The system shall allow selection of exactly one active device.

* **FR2.3** The system shall require a valid license before enabling data streaming.

* **FR2.4** The system shall handle device disconnect events gracefully.

---

# FR3 — Calibration Integration

* **FR3.1** The system shall integrate the official SDK calibration workflow.

* **FR3.2** The system shall display calibration quality metrics.

* **FR3.3** The system shall store calibration metadata in the session record.

* **FR3.4** The system shall allow recalibration between participants.

---

# FR4 — Gaze Data Acquisition and Mapping

* **FR4.1** The system shall stream gaze samples in real time.

* **FR4.2** The system shall convert normalized gaze coordinates into screen-space coordinates.

* **FR4.3** The system shall map gaze coordinates to content regions
  (e.g., paragraph, line, or word).

* **FR4.4** The system shall expose gaze-to-content events via a stable internal interface.

---

# FR5 — Reading Content and Presentation

* **FR5.1** The system shall support loading and rendering plain text and PDF documents.

* **FR5.2** The system shall provide multiple visual presets optimized for readability.

* **FR5.3** The system shall allow the researcher to lock visual presets per session.

* **FR5.4** Rendering shall maintain consistent coordinate references for mapping.

---

# FR6 — Researcher Interface (Second Screen)

* **FR6.1** The system shall provide a live mirrored view of the subject’s reading interface.

* **FR6.2** The researcher interface shall display system health indicators:

  * sample rate
  * validity rate
  * latency

* **FR6.3** The researcher shall be able to trigger manual interventions from this interface.

---

# FR7 — Intervention Runtime

* **FR7.1** The system shall support pluggable intervention modules.

* **FR7.2** New intervention modules shall be addable without modifying existing intervention code.

* **FR7.3** Interventions shall declare required inputs and supported parameters.

* **FR7.4** The runtime shall support manual, automated, and hybrid triggering.

---

# FR8 — Decision Strategy Abstraction

* **FR8.1** The system shall support interchangeable decision strategies.

* **FR8.2** The system shall allow enabling/disabling strategies per session.

* **FR8.3** The system shall log the origin and rationale of each intervention event.

---

# FR9 — Context Preservation

* **FR9.1** The system shall anchor the currently read text region during layout-changing interventions.

* **FR9.2** The viewport shall adjust automatically to preserve reading position.

* **FR9.3** Failures to preserve context shall be logged.

---

# FR10 — Latency and Real-Time Performance

* **FR10.1** The system shall measure end-to-end latency from gaze acquisition to intervention trigger.

* **FR10.2** Latency statistics shall be displayed in the researcher interface.

* **FR10.3** The sensing-to-intervention pipeline shall minimize buffering and avoid unnecessary blocking operations.

---

# FR11 — Experimental Control

* **FR11.1** The system shall support predefined session modes:

* No intervention (control)

* Manual-only

* Automated-only

* Hybrid

* **FR11.2** The active experimental condition shall be logged.

---

# FR12 — Logging and Export

* **FR12.1** The system shall log raw gaze samples.

* **FR12.2** The system shall log derived gaze events.

* **FR12.3** The system shall log intervention events with timestamps and source.

* **FR12.4** The system shall allow exporting session data in JSON and CSV formats.

* **FR12.5** Exported data shall include schema versioning and session metadata.

---

# Non-Functional Requirements (NFR)

---

# NFR1 — Modularity

The system shall maintain strict separation between:

* sensing
* mapping
* decision strategies
* intervention rendering
* researcher interface
* session management

---

# NFR2 — Low Latency

The architecture shall be optimized for **near real-time processing** suitable for just-in-time micro-interventions.

---

# NFR3 — Usability

The system shall minimize setup complexity and reduce experimenter cognitive load through:

* guided workflows
* clear status indicators

---

# NFR4 — Reliability

The system shall fail gracefully in case of:

* device disconnection
* invalid license
* streaming failure

---

# NFR5 — Reproducibility

All session parameters, calibration metrics, intervention settings, and system versions shall be recorded to enable replication.

---

# NFR6 — Extensibility

Adding new intervention types or decision strategies shall require **only additive code** and shall not require modification of existing modules.

---

# Actor Description

This section identifies the primary and secondary actors interacting with the adaptive reading system.

---

# 1. Test Subject (Reader)

The **Test Subject** is the participant who reads text within the adaptive reading application while connected to the eye tracker.

The Test Subject:

* Reads the presented text (plain text or PDF content)
* Is exposed to visual presets and adaptive micro-interventions
* Does not interact with system configuration or technical setup
* Should experience minimal disruption, preserved reading context, and smooth flow

From a system design perspective, the Test Subject interacts only with the **subject reading interface**, which must prioritize usability, legibility, and cognitive comfort.

---

# 2. Researcher (Experimenter)

The **Researcher** is responsible for conducting and managing experimental sessions.

The Researcher:

* Launches and configures the system
* Selects and licenses the eye tracker
* Loads reading material
* Chooses visual presets and intervention configurations
* Observes the subject’s reading view through the second-screen mirror
* Manually applies or overrides micro-interventions
* Starts/stops sessions and exports data

The system must minimize setup complexity and provide clear status indicators.

---

# 3. Eye Tracker Device (Tobii Hardware)

The **Eye Tracker Device** is an external hardware actor providing real-time gaze and pupil data via USB.

The Eye Tracker:

* Streams gaze coordinates, timestamps, and validity signals
* Requires proper license provisioning
* May connect or disconnect dynamically
* Acts as the primary sensing source for adaptive behaviour

Architecturally, the device interacts with the system exclusively through the **sensing module**.

---

# 4. Intervention Module (Pluggable Component)

The **Intervention Module** represents a logical actor within the system architecture.

Each intervention module:

* Receives structured input (e.g., gaze-to-content mapping, reading state)
* Produces UI adaptation commands (e.g., font size change, contrast adjustment)
* Must be addable without modifying existing code
* May be triggered manually, rule-based, or automated

This actor reflects the architectural requirement of **modularity and extensibility**.

---

# 5. Session & Data Consumer (Post-Processing Actor)

The **Data Consumer** represents the downstream actor (e.g., researcher, analyst, or analysis software) that consumes exported session data.

This actor:

* Receives structured JSON/CSV exports
* Uses session metadata and logs for reproducibility
* Analyzes gaze data, intervention timing, and reading behaviour

---

# Summary

The system therefore supports five primary actors:

1. **Test Subject** — End-user experiencing adaptive reading
2. **Researcher** — Experiment conductor and system operator
3. **Eye Tracker Device** — External sensing hardware
4. **Intervention Module** — Pluggable adaptation logic component
5. **Data Consumer** — Post-session analysis stakeholder

