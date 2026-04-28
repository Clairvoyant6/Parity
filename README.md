# Parity: Open-Source AI Fairness Auditing

**Parity** is a modern, full-stack application designed to help developers, data scientists, and compliance officers detect, understand, and fix algorithmic bias in their machine learning datasets and models.

Built on top of robust frameworks like **AIF360** and **Fairlearn**, Parity provides a beautiful React interface combined with a powerful FastAPI backend to make fairness auditing accessible, intuitive, and actionable.

---

## 🌟 Key Features

- **Automated Bias Detection:** Upload any CSV dataset, label your target and sensitive variables, and let Parity calculate fairness metrics instantly.
- **Comprehensive Metrics:** Analyzes Disparate Impact Ratio, Demographic Parity Difference, Equalized Odds, and Predictive Parity.
- **Proxy Feature Detection:** Uses correlation and SHAP differential importance to identify "neutral" features that secretly proxy for protected attributes.
- **AI-Powered Explanations:** Leverages Groq / LLaMA to provide plain-English explanations of why bias exists in your data and how to interpret the metrics.
- **What-If Explorer:** Interactively change feature values and immediately see how those changes affect fairness and risk scores.
- **PDF Report Generation:** Export full fairness audit reports with a single click for compliance and governance.
- **Pre-Loaded Demo Datasets:** Includes domain-specific datasets out of the box (Hiring, Lending, Healthcare, Education, and Criminal Justice) so you can test the platform instantly.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS v4, Lucide Icons, and custom Google Fonts (DM Sans, Inter, JetBrains Mono)
- **Routing:** React Router v7
- **Charts:** Recharts

### Backend
- **Framework:** FastAPI (Python)
- **Fairness Engine:** IBM's AI Fairness 360 (AIF360), Microsoft's Fairlearn, and SHAP for explainability.
- **Data Processing:** Pandas, Scikit-learn
- **AI Integration:** Groq API for generating explanations

---

## 🧠 How It Works

Parity simplifies the complex workflow of fairness auditing into a three-step process:

1. **Data Ingestion:** Upload your dataset. The frontend previews the data and allows you to select which columns represent the **Target Variable** (what you're predicting or measuring) and the **Sensitive Variables** (demographics like race, gender, or age).
2. **Bias Engine Processing:** The FastAPI backend processes the data using `scikit-learn` to train a baseline RandomForest model. It then utilizes **AIF360** to measure the disparities in positive prediction rates between different demographic groups.
3. **Explainability & Proxy Detection:** The engine calculates **SHAP** (SHapley Additive exPlanations) values to determine which features have the biggest impact on the outcome. It cross-references these with correlation matrices to identify "Proxy Features"—seemingly neutral data points (like ZIP code) that inadvertently leak sensitive information.

---

## 📊 Fairness Metrics Explained

When reviewing your analysis dashboard, Parity surfaces several industry-standard fairness metrics:

- **Disparate Impact (DI) Ratio:** Also known as the "80% rule" or the "Four-Fifths rule". It compares the proportion of individuals in the unprivileged group who receive a positive outcome to the proportion in the privileged group. A score below `0.8` is generally considered a violation.
- **Demographic Parity Difference (DPD):** The absolute difference in positive outcome rates between groups. Ideally, this should be close to `0`. A difference greater than `0.2` (20%) indicates significant bias.
- **Equalized Odds:** Measures whether the model has equal true positive rates and false positive rates across different demographic groups.
- **Predictive Parity:** Evaluates whether the precision (positive predictive value) of the model is consistent across demographic groups.

---

## 🔌 API Documentation

The FastAPI backend provides several endpoints that can be integrated directly into your MLOps pipelines:

- `GET /api/health`: Health check endpoint.
- `POST /api/preview`: Upload a CSV to quickly retrieve column names and the first 5 rows without running a full analysis.
- `POST /api/analyze`: The core analysis endpoint. Accepts the CSV, target column, and sensitive columns, returning the complete bias metrics and AI explanations.
- `POST /api/whatif`: Runs a counterfactual analysis by substituting a specific feature's value across the dataset and re-calculating the bias metrics to determine the impact of that change.
- `POST /api/export-report`: Generates and returns a downloadable PDF report summarizing the audit.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Python 3.10+

### Installation

1. **Clone the repository and install frontend dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up the Python backend:**
   ```bash
   cd backend
   python -m venv venv
   # Activate the virtual environment:
   # Windows: venv\Scripts\activate
   # Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   *(Note: The app will still function without this, but the AI text explanations will be disabled.)*

### Running the Application

You can start both the frontend and backend concurrently from the project root using a single command:

```bash
pnpm run dev
```

Alternatively, you can run them separately:
- **Frontend:** `pnpm run dev:frontend` (starts on `http://localhost:5173`)
- **Backend:** `pnpm run dev:backend` (starts on `http://localhost:8000`)

---

## 📂 Project Structure

```text
parity/
├── backend/                  # Python FastAPI Backend
│   ├── app/                  # Backend application code
│   │   ├── api/routes.py     # API endpoints (/analyze, /whatif, etc.)
│   │   ├── services/         # Bias computation, SHAP, and report generation
│   │   └── core/             # Configuration and database (if applicable)
│   ├── datasets/             # Local data storage for the backend
│   └── main.py               # FastAPI entry point
├── public/                   # Frontend public assets
│   └── datasets/             # Demo CSV datasets for the UI
├── src/                      # React Frontend
│   ├── app/                  
│   │   ├── components/       # Reusable UI components and landing page sections
│   │   └── pages/            # Main application views (Upload, Dashboard, What-If)
│   ├── context/              # React Context for global analysis state
│   ├── services/             # API client wrappers
│   └── styles/               # Global CSS and Tailwind directives
└── package.json              # Frontend dependencies and concurrent scripts
```

---

## 🧪 Demo Datasets

Parity comes bundled with synthetic and historical datasets to test the system:

1. **COMPAS Recidivism:** A real-world criminal justice dataset highlighting racial bias in predictive policing.
2. **Adult Income:** A demographic dataset for testing hiring/income prediction models.
3. **German Credit:** A classic dataset for assessing bias in loan approvals.
4. **Heart Disease:** A healthcare dataset simulating bias in risk assessments.
5. **Student Performance:** An educational dataset reflecting socioeconomic biases.

Access these directly from the `Upload Your Dataset` page in the application.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to help improve Parity:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
