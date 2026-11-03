# IELTS Quest — General Training

A responsive, installable starter PWA for IELTS General Training practice. The first MVP includes an original Reading notice exercise, multiple-choice answer checking, score tracking, and local progress storage.

## Run locally

Serve the repository directory over HTTP (service workers do not work from `file://`). For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Material and rights

The included exercise is original practice content written for this project. It is not reproduced from a real or past IELTS test. Add third-party exercises only after confirming the applicable license/permission, and keep source and permission details with each item.

## Current scope

- Responsive phone and desktop UI
- Reading exercise with five questions
- Score, correct-answer count, daily target, and streak stored in the browser
- PWA manifest and basic offline caching

Listening, Writing, Speaking, accounts, and cross-device sync are not implemented yet.
