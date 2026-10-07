# HEDS CUPS Developer Guide

This document covers how to set up, verify, and use Linux CUPS (Common Unix Printing System)
as the physical print backend for the HEDS Edge Agent.

---

## 1. What is CUPS?

CUPS is the open-source printing system used on Linux and macOS.
It exposes printers via IPP (Internet Printing Protocol) and provides CLI utilities
for managing queues, submitting jobs, and querying printer state.

HEDS communicates with CUPS through the standard CLI utilities:

| Binary        | Purpose                               |
|---------------|---------------------------------------|
| `lp`          | Submit a print job                    |
| `lpstat`      | Query printer status and queue state  |
| `lpoptions`   | Query printer capabilities (PPD)      |
| `cancel`      | Cancel a queued or active job         |
| `cupsenable`  | Enable (un-pause) a printer queue     |
| `cupsdisable` | Disable (pause) a printer queue       |

---

## 2. Installing CUPS on Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y cups cups-client cups-bsd

# Start and enable CUPS daemon
sudo systemctl start cups
sudo systemctl enable cups

# Verify daemon is running
systemctl status cups
```

Expected output:
```
● cups.service - CUPS Scheduler
     Active: active (running)
```

---

## 3. Checking CUPS Service Status

```bash
# Via CUPS CLI
lpstat -r
# Expected: "scheduler is running"

# List all printers with status
lpstat -p
```

---

## 4. Listing Printers

```bash
lpstat -p

# Example output:
# printer Xerox-WorkCentre is idle.  enabled since Tue 06 Oct 2026 10:00:00
# printer HP-LaserJet is idle.  enabled since Tue 06 Oct 2026 10:01:00
```

---

## 5. Checking Printer Capabilities

```bash
lpoptions -p <printer_name> -l

# Example output:
# PageSize/Media Size: *A4 A3 Letter Legal
# Duplex/2-Sided Printing: None *DuplexNoTumble DuplexTumble
# ColorModel/Color Mode: *RGB CMYK Gray
# Resolution/Output Resolution: 300dpi *600dpi 1200dpi
```

The `*` prefix indicates the currently selected default value.

---

## 6. Checking Print Queues

```bash
lpq -a                          # All active jobs
lpq -P <printer_name>           # Jobs for a specific printer
lpstat -W completed             # Completed jobs
lpstat -W not-completed         # Active/pending jobs
```

---

## 7. Adding a Printer

### Via CUPS Web UI (Recommended)

```bash
xdg-open http://localhost:631
# Navigate: Administration > Add Printer
```

### Via CLI

```bash
# Network IPP printer
sudo lpadmin -p Network-Xerox -E -v ipp://192.168.1.50/ipp/print -m everywhere

# Raw test queue (development / file sink)
sudo lpadmin -p Test_Office_Printer -v file:/dev/null -E -m raw

# Verify
lpstat -p
```

---

## 8. Testing a Printer Manually

```bash
# Print test page
lp -d <printer_name> /usr/share/cups/data/testprint

# Print PDF with B&W duplex A4
lp -d <printer_name> \
   -o ColorModel=Gray \
   -o sides=two-sided-long-edge \
   -o PageSize=A4 \
   -o copies=1 \
   /path/to/document.pdf

# Check job status
lpstat -W not-completed
```

---

## 9. Virtual PDF Printer (development without hardware)

```bash
sudo apt install -y cups-pdf

# Output saved to /var/spool/cups-pdf/<username>/
# Virtual printer appears as "PDF" in lpstat
```

Set `CUPS_PRINTER_NAME=PDF` in agent config for paperless testing.

---

## 10. Running the HEDS Agent Against CUPS

### Configuration (`agent/.env`)

```bash
PRINT_BACKEND=cups
CUPS_PRINTER_NAME=Xerox-WorkCentre
HEDS_API_URL=https://your-heds-cloud.com
AGENT_TOKEN=<your-agent-token>
```

### Starting the Agent

```bash
cd agent
source ../.venv/bin/activate
python -m heds_agent.main
```

### Expected Log Output (Successful Job)

```
INFO  event=agent_started agent_id=... version=0.1.0
INFO  event=heartbeat_sent printer_count=1 online=1
INFO  event=job_claimed heds_job_id=HDS-82A1
INFO  event=job_stored_locally heds_job_id=HDS-82A1
INFO  Submitting CUPS physical job: lp -d Xerox-WorkCentre -t HEDS-HDS-82A1 ...
INFO  Successfully enqueued CUPS job Xerox-WorkCentre-7 for HEDS HDS-82A1
INFO  event=job_dispatched heds_job_id=HDS-82A1 cups_job_id=Xerox-WorkCentre-7
```

---

## 11. Common Troubleshooting

| Symptom                           | Likely Cause              | Fix                              |
|-----------------------------------|---------------------------|----------------------------------|
| `No destinations added`           | No printers registered    | Run `lpadmin` to add a printer   |
| `Printer is stopped`              | Queue paused              | `cupsenable <name>`              |
| Job submitted, nothing prints     | Printer offline           | Check physical connection        |
| `pycups` install fails            | Missing `libcups2-dev`    | Install headers or use CLI mode  |

---

## 12. Installing pycups (Optional)

```bash
sudo apt install -y libcups2-dev
.venv/bin/pip install pycups
```

> HEDS defaults to CLI fallback (`lp`, `lpstat`, `lpoptions`) and requires no C compilation.
> `pycups` is optional but provides deeper integration when available.

---

## 13. Docker CUPS Environment (Optional Integration Testing)

```yaml
# docker-compose.cups.yml
services:
  cups:
    image: olbat/cupsd
    privileged: true
    ports:
      - "631:631"
    environment:
      - CUPSADMIN=admin
      - CUPSPASSWORD=admin
```

```bash
docker compose -f docker-compose.yml -f docker-compose.cups.yml up cups
curl http://localhost:631/printers/
```

> This is **NOT** part of the default `docker compose up` flow.
> Default environment uses `PRINT_BACKEND=mock` and requires no physical printer.
