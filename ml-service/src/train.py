import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

def load_data(data_path: str = None) -> pd.DataFrame:
    """Load training dataset from CSV."""
    if data_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, "models", "training_data.csv")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training data not found at {data_path}. Please run data_generator.py first.")
    
    df = pd.read_csv(data_path)
    return df

def build_preprocessor(numeric_features: list, categorical_features: list) -> ColumnTransformer:
    """Build ColumnTransformer for numeric scaling and categorical one-hot encoding."""
    numeric_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )
    return preprocessor

def train_and_evaluate_models():
    """Train multiple models, evaluate, select best, and save artifacts."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Load Data
    df = load_data()
    print(f"Loaded dataset with {len(df)} samples and {df.shape[1]} columns.")
    
    numeric_features = ["amount_due", "days_overdue", "payment_history_score", "total_past_defaults"]
    categorical_features = ["case_type", "npa_status", "failure_reason"]
    target_column = "recovered"
    
    X = df[numeric_features + categorical_features]
    y = df[target_column]
    
    # 2 & 3. Split into train/test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Build & fit preprocessor
    preprocessor = build_preprocessor(numeric_features, categorical_features)
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Extract feature names after transformation
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_feature_names = cat_encoder.get_feature_names_out(categorical_features).tolist()
    all_feature_names = numeric_features + cat_feature_names
    
    # 4. Define candidate models
    candidate_models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForestClassifier": RandomForestClassifier(n_estimators=100, random_state=42),
        "GradientBoostingClassifier": GradientBoostingClassifier(random_state=42),
    }
    
    model_results = {}
    trained_models = {}
    
    print("\nTraining and evaluating models...")
    for name, model in candidate_models.items():
        # Train
        model.fit(X_train_trans, y_train)
        trained_models[name] = model
        
        # Predict
        y_pred = model.predict(X_test_trans)
        y_proba = model.predict_proba(X_test_trans)[:, 1]
        
        # Evaluate
        acc = accuracy_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_proba)
        
        model_results[name] = {
            "accuracy": round(float(acc), 4),
            "roc_auc": round(float(roc), 4),
        }
    
    # 5. Print Comparison Summary Table
    header = f"{'Model':<28} | {'Accuracy':<10} | {'ROC-AUC':<10}"
    separator = "-" * len(header)
    print("\n" + separator)
    print("        MODEL PERFORMANCE COMPARISON")
    print(separator)
    print(header)
    print(separator)
    for name, metrics in model_results.items():
        print(f"{name:<28} | {metrics['accuracy']:<10.4f} | {metrics['roc_auc']:<10.4f}")
    print(separator)
    
    # 6. Pick best-performing model (primary: ROC-AUC, secondary: Accuracy)
    best_model_name = max(
        model_results.keys(),
        key=lambda k: (model_results[k]["roc_auc"], model_results[k]["accuracy"])
    )
    best_model = trained_models[best_model_name]
    print(f"\nWinning Model: {best_model_name} (ROC-AUC: {model_results[best_model_name]['roc_auc']:.4f}, Accuracy: {model_results[best_model_name]['accuracy']:.4f})")
    
    # Extract Feature Importances / Coefficients
    feature_importances = {}
    if hasattr(best_model, "feature_importances_"):
        raw_importances = best_model.feature_importances_
        for feat, imp in zip(all_feature_names, raw_importances):
            feature_importances[feat] = round(float(imp), 4)
    elif hasattr(best_model, "coef_"):
        raw_coefs = np.abs(best_model.coef_[0])
        # Normalize coefficients to sum to 1 for consistency
        norm_coefs = raw_coefs / np.sum(raw_coefs)
        for feat, imp in zip(all_feature_names, norm_coefs):
            feature_importances[feat] = round(float(imp), 4)
            
    # Sort feature importances descending
    sorted_feature_importances = dict(
        sorted(feature_importances.items(), key=lambda item: item[1], reverse=True)
    )
    
    # Build complete end-to-end inference pipeline for easy direct prediction
    full_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", best_model)
    ])
    
    # Save artifacts
    best_model_path = os.path.join(models_dir, "best_model.joblib")
    preprocessor_path = os.path.join(models_dir, "preprocessor.joblib")
    pipeline_path = os.path.join(models_dir, "pipeline.joblib")
    metrics_path = os.path.join(models_dir, "metrics.json")
    
    joblib.dump(best_model, best_model_path)
    joblib.dump(preprocessor, preprocessor_path)
    joblib.dump(full_pipeline, pipeline_path)
    
    metrics_payload = {
        "models": model_results,
        "winning_model": best_model_name,
        "winning_model_metrics": model_results[best_model_name],
        "feature_names": all_feature_names,
        "feature_importances": sorted_feature_importances
    }
    
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
        
    print(f"\nArtifacts saved successfully:")
    print(f"  - Model:        {best_model_path}")
    print(f"  - Preprocessor: {preprocessor_path}")
    print(f"  - Pipeline:     {pipeline_path}")
    print(f"  - Metrics:      {metrics_path}")
    
    print("\nTop Feature Importances:")
    for feat, imp in list(sorted_feature_importances.items())[:6]:
        print(f"  • {feat:<30}: {imp:.4f}")

if __name__ == "__main__":
    train_and_evaluate_models()
