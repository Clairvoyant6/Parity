import pandas as pd
import numpy as np
import os
import shutil

# Ensure public/datasets directory exists
output_dir = r"c:\Users\Admin\Projects\Parity\public\datasets"
os.makedirs(output_dir, exist_ok=True)

# Copy compas dataset
try:
    shutil.copy(r"c:\Users\Admin\Projects\Parity\backend\datasets\compas-scores-two-years.csv", 
                os.path.join(output_dir, "compas-scores-two-years.csv"))
    print("Copied COMPAS dataset.")
except Exception as e:
    print("Failed to copy COMPAS dataset:", e)

# Set random seed
np.random.seed(42)
n_samples = 300

# 1. Adult Income (General/Hiring)
# Target: income (>50K), Sensitive: sex, race
sex = np.random.choice(['Male', 'Female'], n_samples, p=[0.6, 0.4])
race = np.random.choice(['White', 'Non-White'], n_samples, p=[0.7, 0.3])
age = np.random.randint(18, 65, n_samples)
education_years = np.random.randint(8, 20, n_samples)

# Bias generation: Males and Whites have slightly higher base score
base_score = education_years * 2 + age * 0.5
bias_score = np.where(sex == 'Male', 5, 0) + np.where(race == 'White', 3, 0)
total_score = base_score + bias_score + np.random.normal(0, 5, n_samples)

income = (total_score > np.percentile(total_score, 70)).astype(int)

df_adult = pd.DataFrame({
    'age': age,
    'education_years': education_years,
    'sex': sex,
    'race': race,
    'income_over_50k': income
})
df_adult.to_csv(os.path.join(output_dir, "adult-income.csv"), index=False)
print("Generated adult-income.csv")

# 2. German Credit (Lending)
# Target: approved, Sensitive: foreign_worker, age_group
foreign_worker = np.random.choice(['yes', 'no'], n_samples, p=[0.2, 0.8])
age_group = np.random.choice(['young', 'adult', 'senior'], n_samples, p=[0.2, 0.6, 0.2])
credit_amount = np.random.randint(1000, 15000, n_samples)
duration_months = np.random.randint(6, 48, n_samples)

# Bias generation
base_score = credit_amount * -0.01 + duration_months * -1
bias_score = np.where(foreign_worker == 'yes', -20, 0) + np.where(age_group == 'young', -15, 0)
total_score = base_score + bias_score + np.random.normal(0, 20, n_samples)

approved = (total_score > np.percentile(total_score, 40)).astype(int)

df_german = pd.DataFrame({
    'credit_amount': credit_amount,
    'duration_months': duration_months,
    'foreign_worker': foreign_worker,
    'age_group': age_group,
    'approved': approved
})
df_german.to_csv(os.path.join(output_dir, "german-credit.csv"), index=False)
print("Generated german-credit.csv")

# 3. Heart Disease (Healthcare)
# Target: high_risk, Sensitive: sex, age
sex = np.random.choice(['Male', 'Female'], n_samples, p=[0.5, 0.5])
age = np.random.randint(30, 80, n_samples)
cholesterol = np.random.randint(150, 300, n_samples)
max_heart_rate = np.random.randint(100, 180, n_samples)

# Bias: Females assigned systematically lower risk scores despite similar indicators
base_score = age * 0.5 + cholesterol * 0.1 - max_heart_rate * 0.1
bias_score = np.where(sex == 'Female', -10, 0)
total_score = base_score + bias_score + np.random.normal(0, 5, n_samples)

high_risk = (total_score > np.percentile(total_score, 50)).astype(int)

df_heart = pd.DataFrame({
    'age': age,
    'cholesterol': cholesterol,
    'max_heart_rate': max_heart_rate,
    'sex': sex,
    'high_risk': high_risk
})
df_heart.to_csv(os.path.join(output_dir, "heart-disease.csv"), index=False)
print("Generated heart-disease.csv")

# 4. Student Performance (Education)
# Target: passed, Sensitive: socioeconomic_status
ses = np.random.choice(['Low', 'Medium', 'High'], n_samples, p=[0.3, 0.4, 0.3])
study_hours = np.random.randint(2, 20, n_samples)
absences = np.random.randint(0, 30, n_samples)

# Bias: Lower SES students graded harsher
base_score = study_hours * 3 - absences * 1
bias_score = np.where(ses == 'Low', -15, np.where(ses == 'High', 10, 0))
total_score = base_score + bias_score + np.random.normal(0, 10, n_samples)

passed = (total_score > np.percentile(total_score, 30)).astype(int)

df_student = pd.DataFrame({
    'study_hours': study_hours,
    'absences': absences,
    'socioeconomic_status': ses,
    'passed': passed
})
df_student.to_csv(os.path.join(output_dir, "student-performance.csv"), index=False)
print("Generated student-performance.csv")
