# Deploying Stock Analyzer to Google Cloud Run

This guide starts from a new Google Cloud project and deploys the entire
frontend and backend as one Cloud Run service.

## 1. Install and Initialize Google Cloud CLI

Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), then
authenticate:

```bash
gcloud init
gcloud auth login
gcloud auth list
```

## 2. Create or Select a Google Cloud Project

Create a new project:

```bash
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

Alternatively, select an existing project:

```bash
gcloud config set project YOUR_PROJECT_ID
```

Attach a billing account in the
[Google Cloud Console](https://console.cloud.google.com/billing).

Enable the required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

## 3. Clone the Application

```bash
git clone https://github.com/tyungchan/stock-analyzer.git
cd stock-analyzer
```

## 4. Create a Dedicated Service Account

```bash
gcloud iam service-accounts create stock-analyzer \
  --display-name="Stock Analyzer Cloud Run"
```

Set reusable shell variables:

```bash
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT="stock-analyzer@${PROJECT_ID}.iam.gserviceaccount.com"
```

## 5. Store the LLM API Key

The application uses Anthropic by default. Read the key without displaying it
or saving it directly in shell history:

```bash
read -s ANTHROPIC_KEY
printf "%s" "$ANTHROPIC_KEY" | \
  gcloud secrets create anthropic-api-key --data-file=-
unset ANTHROPIC_KEY
```

If the secret already exists, add a new version:

```bash
read -s ANTHROPIC_KEY
printf "%s" "$ANTHROPIC_KEY" | \
  gcloud secrets versions add anthropic-api-key --data-file=-
unset ANTHROPIC_KEY
```

## 6. Create the Private Application Access Code

This code protects the paid analysis endpoint. It is separate from the LLM API
key:

```bash
openssl rand -base64 32 | \
  gcloud secrets create stock-analyzer-access-token --data-file=-
```

## 7. Grant the Service Account Secret Access

```bash
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stock-analyzer-access-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## 8. Deploy the Entire Application

```bash
gcloud run deploy stock-analyzer \
  --source . \
  --region australia-southeast1 \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --cpu 1 \
  --memory 512Mi \
  --concurrency 5 \
  --timeout 300 \
  --set-env-vars="ANALYSIS_PROVIDER=anthropic,ANALYSIS_MODEL=claude-haiku-4-5-20251001,RATE_MAX=3,DAILY_MAX=50" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,APP_ACCESS_TOKEN=stock-analyzer-access-token:latest"
```

Approve creation of the Artifact Registry repository if prompted. The command
returns the public HTTPS address of the service.

## 9. Retrieve the Private Access Code

```bash
gcloud secrets versions access latest \
  --secret=stock-analyzer-access-token
```

Open the Cloud Run URL, enter the access code, enter a ticker such as `AAPL`,
and select **Analyze**.

## 10. Configure Cost Controls

In Google Cloud Console:

1. Open **Billing**.
2. Select **Budgets & alerts**.
3. Create a small monthly budget.
4. Add alerts at 50%, 90%, and 100%.

Budget alerts do not automatically stop services. Also configure a spending
limit with the selected LLM provider.

The deployment command applies these safeguards:

- Minimum instances is `0`, allowing scale-to-zero.
- Maximum instances is `1`.
- Concurrency is limited to `5`.
- Each IP is limited to three analysis requests per minute.
- Each running instance allows up to 50 attempted analyses per UTC day.
- The economical Haiku model is selected by default.

The daily application counter is stored in memory and resets when Cloud Run
starts a new instance. Provider-side spending limits remain the strongest
hard-cost control.

## Updating the Application

Pull the latest changes and redeploy:

```bash
git pull

gcloud run deploy stock-analyzer \
  --source . \
  --region australia-southeast1
```

## Operational Commands

Describe the service:

```bash
gcloud run services describe stock-analyzer \
  --region australia-southeast1
```

Read recent logs:

```bash
gcloud run services logs read stock-analyzer \
  --region australia-southeast1 \
  --limit 50
```

Retrieve the service URL:

```bash
gcloud run services describe stock-analyzer \
  --region australia-southeast1 \
  --format="value(status.url)"
```

## Disabling or Removing the Service

Remove public access:

```bash
gcloud run services remove-iam-policy-binding stock-analyzer \
  --region australia-southeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

Delete the service and secrets:

```bash
gcloud run services delete stock-analyzer \
  --region australia-southeast1

gcloud secrets delete anthropic-api-key
gcloud secrets delete stock-analyzer-access-token
```
