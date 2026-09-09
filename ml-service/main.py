import json
import os
from contextlib import asynccontextmanager
from typing import Dict, Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Global artifacts storage
artifacts: Dict[str, Any] = {}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "best_model.joblib")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessor.joblib")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")

def load_ml_artifacts():
    """Load model, preprocessor, and metrics from disk."""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROCESSOR_PATH):
        raise RuntimeError(
            f"Artifacts not found in {MODELS_DIR}. Please run 'python src/train.py' first."
        )
    
    artifacts["model"] = joblib.load(MODEL_PATH)
    artifacts["preprocessor"] = joblib.load(PREPROCESSOR_PATH)
    
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            artifacts["metrics"] = json.load(f)
    else:
        artifacts["metrics"] = {}
        
    print(f"Loaded ML artifacts successfully from {MODELS_DIR}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    load_ml_artifacts()
    yield
    # Shutdown
    artifacts.clear()

app = FastAPI(
    title="RecoveryIQ ML Service",
    description="AI-powered financial recovery probability and risk tier inference engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    case_type: str = Field(..., example="transaction")
    amount_due: float = Field(..., ge=0, example=8500.0)
    days_overdue: int = Field(..., ge=0, example=15)
    npa_status: str = Field(..., example="SMA-0")
    payment_history_score: float = Field(..., ge=0.0, le=1.0, example=0.85)
    total_past_defaults: int = Field(..., ge=0, example=1)
    failure_reason: str = Field(..., example="insufficient_funds")

class PredictResponse(BaseModel):
    recovery_probability: float
    risk_tier: str

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/model-metrics")
def get_model_metrics():
    """Return model evaluation metrics and feature importances."""
    if "metrics" not in artifacts or not artifacts["metrics"]:
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, "r") as f:
                artifacts["metrics"] = json.load(f)
        else:
            raise HTTPException(status_code=404, detail="Model metrics not found.")
    return artifacts["metrics"]

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    """
    Predict recovery probability and risk tier for a given case.
    Risk tiers:
      - > 0.7: High
      - 0.4 - 0.7: Medium
      - < 0.4: Low
    """
    if "model" not in artifacts or "preprocessor" not in artifacts:
        load_ml_artifacts()

    model = artifacts["model"]
    preprocessor = artifacts["preprocessor"]

    # Construct input dataframe
    input_data = pd.DataFrame([{
        "amount_due": request.amount_due,
        "days_overdue": request.days_overdue,
        "payment_history_score": request.payment_history_score,
        "total_past_defaults": request.total_past_defaults,
        "case_type": request.case_type,
        "npa_status": request.npa_status,
        "failure_reason": request.failure_reason
    }])

    try:
        # Preprocess input
        X_trans = preprocessor.transform(input_data)
        
        # Predict probability of recovery (class 1)
        proba = model.predict_proba(X_trans)[0][1]
        recovery_prob = round(float(proba), 4)
        
        # Assign risk tier
        if recovery_prob > 0.7:
            risk_tier = "High"
        elif recovery_prob >= 0.4:
            risk_tier = "Medium"
        else:
            risk_tier = "Low"

        return PredictResponse(
            recovery_probability=recovery_prob,
            risk_tier=risk_tier
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
