# DrainProof: Smart Community Drainage Monitoring & Resolution Verification System

> **AWS Builder Weekly Challenge Prototype**  
> A serverless civic intelligence platform that empowers citizens to report blocked stormwater drains, calculates automated hazard priorities, flags potential nearby duplicates, and enforces **Proof of Resolution** through mandatory before-and-after photographic evidence verified by municipal administrators.

---

## 🏗️ Architecture & Serverless Services

```text
                                  [ Citizen / Admin React Frontend (Vite) ]
                                                     |
                                                     | HTTPS
                                                     v
                                       [ Amazon API Gateway (HTTP API) ]
                                                     |
                         +---------------------------+---------------------------+
                         |                           |                           |
                         v                           v                           v
              [ POST /reports ]            [ GET /reports/{id} ]       [ PATCH /reports/{id}/status ]
            [ Lambda: create_report ]     [ Lambda: get_report ]      [ Lambda: update_status ]
                         |                           |                           |
                         +---------------------------+---------------------------+
                                                     |
                                                     v
                                         [ Amazon DynamoDB ]
                                       (Table: 'DrainReports')
                                                     ^
                                                     |
                       [ POST /reports/{id}/upload-url ] -> Returns Presigned S3 PUT URL
                                                     |
                                                     v
                            [ Direct Browser Upload -> Amazon S3 Private Bucket ]
                                                     |
                                                     v
                                       [ POST /reports/{id}/submit ]
                                                     |
                                                     v
                                         [ AWS Step Functions ]
                                         (ReportProcessingWorkflow)
                                                     |
                    +--------------------------------+-------------------------------+
                    |                                |                               |
                    v                                v                               v
       [ ValidateReportAndImage ]          [ CalculatePriority ]           [ FindPotentialDuplicates ]
        (Checks S3 head metadata)        (Scores 0-100 risk factors)        (Haversine ~300m radius)
                    |                                |                               |
                    +--------------------------------+-------------------------------+
                                                     |
                                                     v
                                         [ PersistProcessingResults ]
                                   (Updates DynamoDB status to UNDER_REVIEW)
```

---

## 🚀 Key Features

1. **Direct S3 Presigned Uploads**: Before and after photographic evidence is securely uploaded directly from the browser to private S3 buckets. High-resolution imagery never transits through Lambda memory limits.
2. **Automated Step Functions Orchestration**: Coordinates multi-step validation, risk prioritization, duplicate detection, and persistent state transitions with retry and error handling.
3. **Transparent Priority Scoring**: Transparently scores reports (0–100) based on severity, risk keywords (`flooding`, `stagnant`, `overflow`), and proximity to key public infrastructure (`hospital`, `school`).
4. **Duplicate Heuristic Flagging**: Reports within 300 meters sharing the same issue type are flagged for human inspection rather than silently deleted.
5. **Enforced Proof of Resolution**: A report cannot become `RESOLVED` without an after-cleanup photograph and explicit audit verification by an administrator.

---

## 💻 Local Quickstart

### Prerequisites
- Node.js (v20+) & npm
- Python (3.12+)
- AWS CLI v2 (`aws configure`)
- AWS SAM CLI (`sam --version`)

### 1. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Deploy Cloud Infrastructure with SAM
```bash
cd ..
sam validate
sam build
sam deploy --guided
```
