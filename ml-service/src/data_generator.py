import os
import numpy as np
import pandas as pd

def generate_npa_status(days_overdue: int) -> str:
    """
    Assign NPA status correlating with days_overdue based on RBI guidelines:
    - Standard: 0 days
    - SMA-0: 1 to 30 days
    - SMA-1: 31 to 60 days
    - SMA-2: 61 to 90 days
    - NPA: > 90 days
    Adds slight stochasticity to reflect classification transitions.
    """
    if days_overdue == 0:
        return "Standard" if np.random.rand() < 0.95 else "SMA-0"
    elif days_overdue <= 30:
        return np.random.choice(["SMA-0", "Standard", "SMA-1"], p=[0.85, 0.10, 0.05])
    elif days_overdue <= 60:
        return np.random.choice(["SMA-1", "SMA-0", "SMA-2"], p=[0.85, 0.08, 0.07])
    elif days_overdue <= 90:
        return np.random.choice(["SMA-2", "SMA-1", "NPA"], p=[0.85, 0.08, 0.07])
    else:
        return np.random.choice(["NPA", "SMA-2"], p=[0.90, 0.10])

def generate_recovery_data(n_samples: int = 5000, random_state: int = 42) -> pd.DataFrame:
    """
    Generate synthetic dataset for training payment/loan recovery models.
    """
    np.random.seed(random_state)
    
    # 1. case_type: randomly "transaction" or "loan"
    case_types = np.random.choice(["transaction", "loan"], size=n_samples, p=[0.6, 0.4])
    
    # 2. amount_due: random float between 500 and 50000
    # Transactions typically skew lower, loans higher
    amount_due = []
    for ct in case_types:
        if ct == "transaction":
            amt = np.random.uniform(500, 20000)
        else:
            amt = np.random.uniform(5000, 50000)
        amount_due.append(round(amt, 2))
    amount_due = np.array(amount_due)
    
    # 3. days_overdue: random int between 0 and 120
    # Skewed towards earlier days overdue
    days_overdue = np.random.choice(
        np.arange(0, 121),
        size=n_samples,
        p=np.linspace(2, 0.5, 121) / np.linspace(2, 0.5, 121).sum()
    )
    
    # 4. npa_status: weighted by days_overdue
    npa_statuses = [generate_npa_status(int(d)) for d in days_overdue]
    
    # 5. payment_history_score: random float between 0 and 1
    # Beta distribution to give realistic realistic credit score spread
    payment_history_scores = np.round(np.random.beta(a=3, b=2, size=n_samples), 4)
    payment_history_scores = np.clip(payment_history_scores, 0.0, 1.0)
    
    # 6. total_past_defaults: random int between 0 and 5
    # Negative correlation with payment_history_score
    past_defaults = []
    for score in payment_history_scores:
        max_def = int((1.0 - score) * 5)
        defaults = np.random.choice(
            np.arange(0, 6),
            p=np.exp(-np.abs(np.arange(0, 6) - max_def)) / np.sum(np.exp(-np.abs(np.arange(0, 6) - max_def)))
        )
        past_defaults.append(int(defaults))
    past_defaults = np.array(past_defaults)
    
    # 7. failure_reason: randomly one of predefined reasons
    failure_reasons = []
    reason_choices_tx = ["card_declined", "insufficient_funds", "bank_downtime", "otp_failure"]
    reason_choices_loan = ["insufficient_funds", "missed_emi", "bank_downtime"]
    
    for ct in case_types:
        if ct == "transaction":
            reason = np.random.choice(reason_choices_tx, p=[0.30, 0.35, 0.15, 0.20])
        else:
            reason = np.random.choice(reason_choices_loan, p=[0.40, 0.45, 0.15])
        failure_reasons.append(reason)
    
    # 8. recovered: binary label (0 or 1)
    # Map NPA status to severity penalty
    npa_penalty_map = {
        "Standard": 0.0,
        "SMA-0": -0.4,
        "SMA-1": -0.9,
        "SMA-2": -1.5,
        "NPA": -2.3
    }
    
    # Map failure reason to recovery effect
    failure_reason_effect = {
        "bank_downtime": 1.2,    # Technical glitch, high likelihood to recover
        "otp_failure": 0.8,      # User dropped off, good recovery likelihood
        "card_declined": 0.0,    # Neutral
        "insufficient_funds": -0.6, # Solvency issue
        "missed_emi": -0.8        # Systematic delay
    }
    
    # Calculate logit (z)
    z = (
        2.2 * payment_history_scores
        - 0.025 * days_overdue
        - 0.35 * past_defaults
        + np.array([npa_penalty_map[status] for status in npa_statuses])
        + np.array([failure_reason_effect[reason] for reason in failure_reasons])
        - 0.00002 * amount_due
        + np.random.normal(loc=0.0, scale=0.45, size=n_samples) # Realistic noise
    )
    
    # Sigmoid function to obtain recovery probability
    probabilities = 1.0 / (1.0 + np.exp(-z))
    recovered = (np.random.rand(n_samples) < probabilities).astype(int)
    
    df = pd.DataFrame({
        "case_type": case_types,
        "amount_due": amount_due,
        "days_overdue": days_overdue,
        "npa_status": npa_statuses,
        "payment_history_score": payment_history_scores,
        "total_past_defaults": past_defaults,
        "failure_reason": failure_reasons,
        "recovered": recovered
    })
    
    return df

def save_dataset(df: pd.DataFrame, output_path: str = None) -> str:
    """Save the dataset to the specified or default models path."""
    if output_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(base_dir, "models")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, "training_data.csv")
    else:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} records and saved to: {output_path}")
    print("\nDataset Summary:")
    print(f"- Overall Recovery Rate: {df['recovered'].mean():.2%}")
    print(f"- Case Types: {dict(df['case_type'].value_counts())}")
    print(f"- NPA Statuses: {dict(df['npa_status'].value_counts())}")
    return output_path

if __name__ == "__main__":
    df = generate_recovery_data(n_samples=5000)
    save_dataset(df)
